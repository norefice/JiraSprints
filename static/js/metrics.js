document.addEventListener('DOMContentLoaded', function() {
    const charts = {};
    
    // Inicializar selects de Materialize
    $('select').formSelect();
    
    // Cargar proyectos
    $.get('/api/projects', function(projects) {
        projects.forEach(project => {
            $('#project-select').append(`<option value="${project.id}">${project.name}</option>`);
        });
        $('select').formSelect();
    });
    
    // Event listeners para los selects
    $('#project-select').change(loadBoards);
    $('#board-select').change(loadSprints);
    $('#sprint-select').change(loadMetrics);
    
    function loadBoards() {
        const projectId = $('#project-select').val();
        $('#board-select').empty().append('<option value="" disabled selected>Choose board</option>').prop('disabled', false);
        $('#sprint-select').empty().append('<option value="" disabled selected>Choose sprint</option>').prop('disabled', true);
        $('.metrics-dashboard').hide();
        
        $.get(`/api/projects/${projectId}/boards`, function(boards) {
            boards.forEach(board => {
                $('#board-select').append(`<option value="${board.id}">${board.name}</option>`);
            });
            $('select').formSelect();
        });
    }

    function loadSprints() {
        const boardId = $('#board-select').val();
        $('#sprint-select').empty().append('<option value="" disabled selected>Choose sprint</option>').prop('disabled', false);
        $('.metrics-dashboard').hide();
        
        $.get(`/api/boards/${boardId}/sprints`, function(sprints) {
            sprints.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            sprints.slice(0, 4).forEach(sprint => {
                const activeBadge = sprint.state === 'active' ? ' (Active)' : '';
                $('#sprint-select').append(`<option value="${sprint.id}">${sprint.name}${activeBadge}</option>`);
            });
            $('select').formSelect();
        });
    }

    function loadMetrics() {
        const sprintId = $('#sprint-select').val();
        const boardId = $('#board-select').val();
        if (!sprintId || !boardId) return;
        
        $('.metrics-dashboard').show();
        // Mostrar todos los indicadores de carga
        $('.progress-wrapper').show();
        
        // Cargar datos del sprint actual
        $.get(`/api/sprints/${sprintId}/advanced-metrics`, function(data) {
            updateTimeAnalysis(data.time_analysis);
            updateTeamPerformance(data.team_performance);
            updateScopeChanges(data.scope_changes);
        });
        
        // Cargar datos históricos de velocidad usando el board_id actual
        $.get(`/api/metrics/velocity/${boardId}`, function(data) {
            updateVelocityTrend(data);
        });
    }
    
    function updateVelocityTrend(velocityData) {
        if (charts.velocity) charts.velocity.destroy();
        
        const ctx = document.getElementById('velocity-chart').getContext('2d');
        const averageLine = new Array(velocityData.sprints.length).fill(velocityData.average);
        
        // Agregar el valor del promedio al contenedor del gráfico
        const averageDisplay = document.createElement('div');
        averageDisplay.style.textAlign = 'center';
        averageDisplay.style.marginBottom = '20px';
        averageDisplay.style.fontSize = '1.2em';
        averageDisplay.innerHTML = `<strong>Team Velocity Average:</strong> <span style="color: #FF9800; font-size: 1.5em">${velocityData.average.toFixed(1)}</span> points per sprint`;
        ctx.canvas.parentNode.insertBefore(averageDisplay, ctx.canvas);

        charts.velocity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: velocityData.sprints,
                datasets: [
                    {
                        label: 'Completed Points',
                        data: velocityData.completed_points,
                        backgroundColor: '#4CAF50',
                        order: 2
                    },
                    {
                        label: 'Average',
                        data: averageLine,
                        type: 'line',
                        borderColor: '#FF9800',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        fill: false,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sprint Velocity Trend (Completed Sprints)',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.dataset.type === 'line') {
                                    return `Team Average: ${context.raw.toFixed(1)} points`;
                                }
                                return `Completed: ${context.raw.toFixed(1)} points`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points'
                        }
                    }
                }
            }
        });
        // Ocultar el indicador de carga después de renderizar
        $('#velocity-chart').closest('.card-content').find('.progress-wrapper').hide();
    }
    
    function updateVelocityMetrics(velocity, efficiency) {
        if (charts.velocity) charts.velocity.destroy();
        
        // Debug info
        console.log('Velocity Data:', velocity);
        console.log('Story Details:', velocity.story_details);
        
        const ctx = document.getElementById('velocity-chart').getContext('2d');
        charts.velocity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Sprint Progress'],
                datasets: [
                    {
                        label: 'Completed Points',
                        data: [velocity.completed_points],
                        backgroundColor: '#4CAF50'
                    },
                    {
                        label: 'Remaining Points',
                        data: [velocity.total_points - velocity.completed_points],
                        backgroundColor: '#FF9800'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: [
                            `Sprint Velocity Metrics`,
                            `Completed: ${velocity.completed_points}/${velocity.total_points} points`,
                            `Stories: ${velocity.completed_stories}/${velocity.total_stories}`,
                            `Completion Rate: ${((velocity.completed_points / velocity.total_points) * 100).toFixed(1)}%`
                        ]
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${value.toFixed(1)} points`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points'
                        },
                        stacked: true
                    },
                    x: {
                        stacked: true
                    }
                }
            }
        });
    }
    
    function updateTimeAnalysis(timeAnalysis) {
        if (charts.timeDistribution) charts.timeDistribution.destroy();
        
        const ctx = document.getElementById('time-distribution-chart').getContext('2d');
        const distribution = timeAnalysis.time_distribution;
        
        // Colores para cada estado
        const statusColors = {
            'planning': '#FFB300',     // Amber
            'development': '#2196F3',  // Blue
            'review': '#FF7043',       // Deep Orange
            'testing': '#7CB342',      // Light Green
            'completed': '#4CAF50',    // Green
            'other': '#9E9E9E'        // Grey for unknown states
        };
        
        const labels = Object.keys(distribution);
        const data = Object.values(distribution);
        const colors = labels.map(label => statusColors[label] || '#9E9E9E');

        // Agregar log para debug
        console.log('Time Distribution Data:', {
            labels,
            data,
            distribution
        });
        
        charts.timeDistribution = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: `Time Distribution by Status (Total: ${data.reduce((a, b) => a + b, 0).toFixed(1)} hours)`
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value.toFixed(1)} hours (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        // Ocultar el indicador de carga después de renderizar
        $('#time-distribution-chart').closest('.card-content').find('.progress-wrapper').hide();
    }
    
    function updateTeamPerformance(teamData) {
        const table = `
            <table class="striped">
                <thead>
                    <tr>
                        <th>Team Member</th>
                        <th>Hours Worked</th>
                        <th>Tasks Completed</th>
                        <th>Avg Hours/Task</th>
                        <th>Efficiency Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(teamData).map(([name, stats]) => `
                        <tr>
                            <td>${name}</td>
                            <td>${stats.total_hours.toFixed(1)}</td>
                            <td>${stats.tasks_count}</td>
                            <td>${stats.avg_hours_per_task.toFixed(1)}</td>
                            <td>${calculateEfficiencyScore(stats)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        $('#team-performance-table').html(table);
        // Ocultar el indicador de carga después de renderizar
        $('#team-performance-table').closest('.card-content').find('.progress-wrapper').hide();
    }
    
    function updateScopeChanges(scopeChanges) {
        const scopeChangeHtml = `
            <div class="row">
                <div class="col s12">
                    <div class="card-panel">
                        <h6>Scope Changes</h6>
                        <p>Stories Added: ${scopeChanges.added}</p>
                        <p>Stories Removed: ${scopeChanges.removed}</p>
                        <p>Net Change: ${scopeChanges.added - scopeChanges.removed}</p>
                    </div>
                </div>
            </div>
        `;
        
        $('#scope-changes').html(scopeChangeHtml);
    }
    
    function calculateEfficiencyScore(stats) {
        const avgHoursPerTask = stats.total_hours / stats.tasks_count;
        if (avgHoursPerTask <= 4) return "Very Efficient";
        if (avgHoursPerTask <= 8) return "Efficient";
        if (avgHoursPerTask <= 12) return "Normal";
        return "Needs Improvement";
    }
});
