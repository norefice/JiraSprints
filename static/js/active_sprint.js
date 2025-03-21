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
    
    // Event listeners
    $('#project-select').change(loadBoards);
    $('#board-select').change(loadActiveSprint);
    
    function loadBoards() {
        const projectId = $('#project-select').val();
        $('#board-select').empty().append('<option value="" disabled selected>Choose board</option>').prop('disabled', false);
        $('.dashboard-content').hide();
        
        $.get(`/api/projects/${projectId}/boards`, function(boards) {
            boards.forEach(board => {
                $('#board-select').append(`<option value="${board.id}">${board.name}</option>`);
            });
            $('select').formSelect();
        });
    }

    function loadActiveSprint() {
        const boardId = $('#board-select').val();
        if (!boardId) return;
        
        $('.dashboard-content').show();
        $('.progress-wrapper').show();
        
        $.get(`/api/sprints/active/${boardId}`, function(data) {
            if (data.error) {
                M.toast({html: data.error, classes: 'red'});
                return;
            }
            
            updateSprintInfo(data.sprint);
            updateBurndownChart(data.burndown_data);
            updateIssuesTypeChart(data.issues_by_type);
            updateIssuesStatusChart(data.issues_by_status);
            
            $('.progress-wrapper').hide();
        }).fail(function() {
            M.toast({html: 'Error loading sprint data', classes: 'red'});
        });
    }
    
    function updateSprintInfo(sprint) {
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
        const today = new Date();
        const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const daysElapsed = (today - startDate) / (1000 * 60 * 60 * 24);
        const progress = Math.min((daysElapsed / totalDays) * 100, 100);
        
        $('#sprint-info').html(`
            <h5>${sprint.name}</h5>
            <p>Start: ${startDate.toLocaleDateString()}</p>
            <p>End: ${endDate.toLocaleDateString()}</p>
            <p>Progress: ${progress.toFixed(1)}%</p>
        `);
        
        $('#progress-bar').css('width', `${progress}%`);
    }
    
    function updateBurndownChart(burndownData) {
        if (charts.burndown) charts.burndown.destroy();
        
        const ctx = document.getElementById('burndown-chart').getContext('2d');
        const totalPoints = burndownData.total_points;
        const remainingPoints = burndownData.remaining_points;
        const completedPoints = totalPoints - remainingPoints;
        const completionPercentage = ((completedPoints / totalPoints) * 100).toFixed(1);
        
        charts.burndown = new Chart(ctx, {
            type: 'line',
            data: {
                labels: burndownData.ideal.map(d => d.date),
                datasets: [
                    {
                        label: 'Ideal Burndown',
                        data: burndownData.ideal.map(d => d.points),
                        borderColor: '#FF9800',
                        borderDash: [5, 5],
                        fill: false
                    },
                    {
                        label: 'Actual Burndown',
                        data: burndownData.actual.map(d => d.points),
                        borderColor: '#4CAF50',
                        tension: 0.1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: [
                            'Sprint Burndown Chart',
                            `Completed: ${completedPoints.toFixed(1)} of ${totalPoints} points (${completionPercentage}%)`
                        ]
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw} points`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Story Points Remaining'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Sprint Days'
                        }
                    }
                }
            }
        });
    }
    
    function updateIssuesTypeChart(issuesByType) {
        if (charts.issuesType) charts.issuesType.destroy();
        
        const ctx = document.getElementById('issues-by-type-chart').getContext('2d');
        charts.issuesType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(issuesByType),
                datasets: [{
                    data: Object.values(issuesByType),
                    backgroundColor: [
                        '#FF9800', '#4CAF50', '#2196F3', '#F44336', '#9C27B0',
                        '#795548', '#607D8B', '#E91E63', '#009688', '#CDDC39'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
    
    function updateIssuesStatusChart(issuesByStatus) {
        if (charts.issuesStatus) charts.issuesStatus.destroy();
        
        const ctx = document.getElementById('issues-by-status-chart').getContext('2d');
        charts.issuesStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(issuesByStatus),
                datasets: [{
                    data: Object.values(issuesByStatus),
                    backgroundColor: [
                        '#E0E0E0', '#2196F3', '#FF9800', '#4CAF50', '#F44336',
                        '#9C27B0', '#795548', '#607D8B'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }
});
