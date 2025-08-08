$(document).ready(function() {
    let selectedSprints = [];
    let analysisData = null;
    let charts = {};

    // Simple Materialize initialization
    if (typeof M !== 'undefined') {
        M.AutoInit();
    }

    // Cargar proyectos al inicio
    loadProjects();

    // Event listeners
    $('#project-select').change(function() {
        const projectId = $(this).val();
        if (projectId) {
            loadBoards(projectId);
        }
    });

    $('#board-select').change(function() {
        const boardId = $(this).val();
        if (boardId) {
            loadSprints(boardId);
        }
    });

    $('#analyze-sprints').click(function() {
        if (selectedSprints.length > 0) {
            analyzeSelectedSprints();
        }
    });

    $('#download-comparative-xlsx').click(function() {
        if (selectedSprints.length > 0) {
            downloadComparativeAnalysis('xlsx');
        }
    });

    $('#download-comparative-csv').click(function() {
        if (selectedSprints.length > 0) {
            downloadComparativeAnalysis('csv');
        }
    });

    function loadProjects() {
        $.get('/api/projects', function(projects) {
            const select = $('#project-select');
            select.empty();
            select.append('<option value="" disabled selected>Selecciona un proyecto</option>');
            
            projects.forEach(project => {
                select.append(`<option value="${project.id}">${project.name}</option>`);
            });
        });
    }

    function loadBoards(projectId) {
        $.get(`/api/projects/${projectId}/boards`, function(boards) {
            const select = $('#board-select');
            select.empty();
            select.append('<option value="" disabled selected>Selecciona un tablero</option>');
            
            boards.forEach(board => {
                select.append(`<option value="${board.id}">${board.name}</option>`);
            });
            
            select.prop('disabled', false);
        });
    }

    function loadSprints(boardId) {
        $.get(`/api/boards/${boardId}/sprints`, function(sprints) {
            // Filtrar solo sprints cerrados
            const closedSprints = sprints.filter(sprint => 
                sprint.state && sprint.state.toUpperCase() === 'CLOSED'
            );
            
            renderSprintSelection(closedSprints);
            $('#sprints-selection').show();
        });
    }

    function renderSprintSelection(sprints) {
        const container = $('#sprints-container');
        container.empty();
        
        const sprintIcons = [
            '🚀', '⚡', '🎯', '💎', '🔥', '🌟', '🎨', '⚙️', '🎪', '🏆'
        ];
        
        sprints.forEach((sprint, index) => {
            const icon = sprintIcons[index % sprintIcons.length];
            const sprintCard = $(`
                <div class="col s12 m6 l4">
                    <div class="card-panel hoverable sprint-card" data-sprint-id="${sprint.id}">
                        <div class="sprint-header">
                            <span class="sprint-icon">${icon}</span>
                            <h6>${sprint.name}</h6>
                        </div>
                        <p class="sprint-dates">
                            <i class="material-icons tiny">event</i>
                            ${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}
                        </p>
                        <label class="sprint-selector">
                            <input type="checkbox" class="sprint-checkbox" data-sprint-id="${sprint.id}" />
                            <span>Seleccionar Sprint</span>
                        </label>
                    </div>
                </div>
            `);
            
            container.append(sprintCard);
        });

        // Event listener para checkboxes
        $('.sprint-checkbox').change(function() {
            const sprintId = parseInt($(this).data('sprint-id'));
            const isChecked = $(this).is(':checked');
            const card = $(this).closest('.sprint-card');
            
            if (isChecked) {
                if (selectedSprints.length >= 10) {
                    $(this).prop('checked', false);
                    M.toast({html: 'Máximo 10 sprints permitidos', classes: 'red'});
                    return;
                }
                selectedSprints.push(sprintId);
                card.addClass('selected');
            } else {
                selectedSprints = selectedSprints.filter(id => id !== sprintId);
                card.removeClass('selected');
            }
            
            updateAnalyzeButton();
        });
    }

    function updateAnalyzeButton() {
        const button = $('#analyze-sprints');
        if (selectedSprints.length > 0) {
            button.prop('disabled', false);
            button.text(`Analizar ${selectedSprints.length} Sprint${selectedSprints.length > 1 ? 's' : ''}`);
        } else {
            button.prop('disabled', true);
            button.text('Analizar Sprints Seleccionados');
        }
    }

    function analyzeSelectedSprints() {
        $('#analysis-progress').show();
        hideAllSections();
        
        $.ajaxSetup({
            contentType: 'application/json',
            processData: false
        });
        

        $.post('/api/metrics/comparative', JSON.stringify({
            sprint_ids: selectedSprints
        }), function(data) {
            analysisData = data;
            $('#analysis-progress').hide();
            renderAnalysis(data);
        }).fail(function() {
            $('#analysis-progress').hide();
            M.toast({html: 'Error al analizar los sprints', classes: 'red'});
        });
    }

    function renderAnalysis(data) {
        renderExecutiveSummary(data);
        renderTeamMetrics(data);
        renderIndividualMetrics(data);
        renderTrendsAnalysis(data);
        renderRecommendations(data);
        $('#download-section').show();
    }

    function renderExecutiveSummary(data) {
        const container = $('#insights-container');
        container.empty();
        
        const insights = generateInsights(data);
        insights.forEach(insight => {
            const insightCard = $(`
                <div class="card-panel ${insight.type === 'alert' ? 'red lighten-4' : 'blue lighten-4'}">
                    <h6>${insight.title}</h6>
                    <p>${insight.description}</p>
                </div>
            `);
            container.append(insightCard);
        });
        
        $('#executive-summary').show();
    }

    function renderTeamMetrics(data) {
        renderVelocityChart(data);
        renderEfficiencyChart(data);
        renderIssueDistributionChart(data);
        renderBugsRatioChart(data);
        renderSupportRatioChart(data);
        renderEstimationQualityChart(data);
        renderTeamMetricsTable(data);
        
        $('#team-metrics').show();
    }

    function renderIndividualMetrics(data) {
        renderIndividualVelocityChart(data);
        renderIndividualHoursChart(data);
        renderSpecializationChart(data);
        renderIndividualMetricsTable(data);
        
        $('#individual-metrics').show();
    }

    function renderTrendsAnalysis(data) {
        renderVelocityTrendChart(data);
        renderEstimationTrendChart(data);
        renderConsistencyChart(data);
        
        $('#trends-analysis').show();
    }

    function renderRecommendations(data) {
        const container = $('#recommendations-container');
        container.empty();
        
        const recommendations = generateRecommendations(data);
        recommendations.forEach(rec => {
            const recCard = $(`
                <div class="card-panel ${rec.priority === 'high' ? 'red lighten-4' : rec.priority === 'medium' ? 'orange lighten-4' : 'green lighten-4'}">
                    <h6>${rec.title}</h6>
                    <p>${rec.description}</p>
                    <p class="grey-text">${rec.suggestion}</p>
                </div>
            `);
            container.append(recCard);
        });
        
        $('#recommendations').show();
    }

    // Funciones de renderizado de gráficos
    function renderVelocityChart(data) {
        const ctx = document.getElementById('velocity-chart').getContext('2d');
        
        if (charts.velocity) {
            charts.velocity.destroy();
        }
        
        charts.velocity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.sprints.map(s => s.name),
                datasets: [
                    {
                        label: 'Story Points Completados',
                        data: data.sprints.map(s => s.completed_points),
                        backgroundColor: 'rgba(25, 118, 210, 0.8)',
                        borderColor: 'rgba(25, 118, 210, 1)',
                        borderWidth: 2,
                        borderRadius: 4
                    },
                    {
                        label: 'Story Points Estimados',
                        data: data.sprints.map(s => s.estimated_points || 0),
                        backgroundColor: 'rgba(255, 152, 0, 0.8)',
                        borderColor: 'rgba(255, 152, 0, 1)',
                        borderWidth: 2,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    function renderEfficiencyChart(data) {
        const ctx = document.getElementById('efficiency-chart').getContext('2d');
        
        if (charts.efficiency) {
            charts.efficiency.destroy();
        }
        
        const efficiencyData = data.sprints.map(s => 
            s.total_hours > 0 ? (s.completed_points / s.total_hours).toFixed(2) : 0
        );
        
        charts.efficiency = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.sprints.map(s => s.name),
                datasets: [{
                    label: 'Story Points/Hora',
                    data: efficiencyData,
                    borderColor: 'rgba(76, 175, 80, 1)',
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: 'rgba(76, 175, 80, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    function renderIssueDistributionChart(data) {
        const ctx = document.getElementById('issue-distribution-chart').getContext('2d');
        
        if (charts.issueDistribution) {
            charts.issueDistribution.destroy();
        }
        
        // Agregar datos de todos los sprints
        const issueTypes = {};
        data.sprints.forEach(sprint => {
            Object.keys(sprint.issue_type_distribution).forEach(type => {
                issueTypes[type] = (issueTypes[type] || 0) + sprint.issue_type_distribution[type];
            });
        });
        
        charts.issueDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(issueTypes),
                datasets: [{
                    data: Object.values(issueTypes),
                    backgroundColor: [
                        'rgba(25, 118, 210, 0.8)',
                        'rgba(76, 175, 80, 0.8)',
                        'rgba(255, 152, 0, 0.8)',
                        'rgba(244, 67, 54, 0.8)',
                        'rgba(156, 39, 176, 0.8)',
                        'rgba(0, 150, 136, 0.8)'
                    ],
                    borderColor: [
                        'rgba(25, 118, 210, 1)',
                        'rgba(76, 175, 80, 1)',
                        'rgba(255, 152, 0, 1)',
                        'rgba(244, 67, 54, 1)',
                        'rgba(156, 39, 176, 1)',
                        'rgba(0, 150, 136, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                }
            }
        });
    }

    function renderBugsRatioChart(data) {
        const ctx = document.getElementById('bugs-ratio-chart').getContext('2d');
        
        if (charts.bugsRatio) {
            charts.bugsRatio.destroy();
        }
        
        const ratios = data.sprints.map(sprint => {
            const bugs = sprint.issue_type_distribution.Bug || 0;
            const features = (sprint.issue_type_distribution.Story || 0) + (sprint.issue_type_distribution.Task || 0);
            return features > 0 ? ((bugs / features) * 100).toFixed(1) : 0;
        });
        
        charts.bugsRatio = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.sprints.map(s => s.name),
                datasets: [{
                    label: 'Ratio Bugs/Features (%)',
                    data: ratios,
                    backgroundColor: 'rgba(244, 67, 54, 0.8)',
                    borderColor: 'rgba(244, 67, 54, 1)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
    
    function renderSupportRatioChart(data) {
        const ctx = document.getElementById('support-ratio-chart').getContext('2d');
        
        if (charts.supportRatio) {
            charts.supportRatio.destroy();
        }
        
        const ratios = data.sprints.map(sprint => {
            const support = sprint.issue_type_distribution.Support || 0;
            const features = (sprint.issue_type_distribution.Story || 0) + (sprint.issue_type_distribution.Task || 0);
            return features > 0 ? ((support / features) * 100).toFixed(1) : 0;
        });
        
        charts.supportRatio = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.sprints.map(s => s.name),
                datasets: [{
                    label: 'Ratio Support/Features (%)',
                    data: ratios,
                    backgroundColor: 'rgba(255, 152, 0, 0.8)',
                    borderColor: 'rgba(255, 152, 0, 1)',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    function renderEstimationQualityChart(data) {
        const ctx = document.getElementById('estimation-quality-chart').getContext('2d');
        
        if (charts.estimationQuality) {
            charts.estimationQuality.destroy();
        }
        
        // Agregar datos de estimación de todos los sprints
        const estimationData = {
            'Sobre-estimado': 0,
            'Correcto': 0,
            'Sub-estimado': 0
        };
        
        data.sprints.forEach(sprint => {
            sprint.estimation_analysis.forEach(analysis => {
                if (analysis.analysis) {
                    estimationData[analysis.analysis]++;
                }
            });
        });
        
        charts.estimationQuality = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(estimationData),
                datasets: [{
                    data: Object.values(estimationData),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 205, 86, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    function renderTeamMetricsTable(data) {
        const container = $('#team-metrics-table');
        container.empty();
        
        let table = `
            <table class="striped responsive-table">
                <thead>
                    <tr>
                        <th>Sprint</th>
                        <th>Story Points Completados</th>
                        <th>Horas Totales</th>
                        <th>Eficiencia (SP/Hora)</th>
                        <th>Ratio Bugs/Features</th>
                        <th>Ratio Support/Features</th>
                        <th>Precisión Estimaciones</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.sprints.forEach(sprint => {
            const efficiency = sprint.total_hours > 0 ? (sprint.completed_points / sprint.total_hours).toFixed(2) : '0';
            const bugsRatio = ((sprint.issue_type_distribution.Bug || 0) / 
                ((sprint.issue_type_distribution.Story || 0) + (sprint.issue_type_distribution.Task || 0)) * 100).toFixed(1);
            const supportRatio = ((sprint.issue_type_distribution.Support || 0) / 
                ((sprint.issue_type_distribution.Story || 0) + (sprint.issue_type_distribution.Task || 0)) * 100).toFixed(1);
            
            table += `
                <tr>
                    <td>${sprint.name}</td>
                    <td>${sprint.completed_points}</td>
                    <td>${sprint.total_hours.toFixed(1)}</td>
                    <td>${efficiency}</td>
                    <td>${bugsRatio}%</td>
                    <td>${supportRatio}%</td>
                    <td>${calculateEstimationAccuracy(sprint)}%</td>
                </tr>
            `;
        });
        
        table += '</tbody></table>';
        container.html(table);
    }

    function renderIndividualVelocityChart(data) {
        const ctx = document.getElementById('individual-velocity-chart').getContext('2d');
        
        if (charts.individualVelocity) {
            charts.individualVelocity.destroy();
        }
        
        const individualData = aggregateIndividualData(data);
        
        charts.individualVelocity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(individualData),
                datasets: [{
                    label: 'Story Points Completados',
                    data: Object.values(individualData).map(d => d.completed_points),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderIndividualHoursChart(data) {
        const ctx = document.getElementById('individual-hours-chart').getContext('2d');
        
        if (charts.individualHours) {
            charts.individualHours.destroy();
        }
        
        const individualData = aggregateIndividualData(data);
        
        charts.individualHours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(individualData),
                datasets: [{
                    label: 'Horas Trabajadas',
                    data: Object.values(individualData).map(d => d.total_hours),
                    backgroundColor: 'rgba(255, 205, 86, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderSpecializationChart(data) {
        const ctx = document.getElementById('specialization-chart').getContext('2d');
        
        if (charts.specialization) {
            charts.specialization.destroy();
        }
        
        const individualData = aggregateIndividualData(data);
        const developers = Object.keys(individualData);
        
        charts.specialization = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: developers,
                datasets: [{
                    label: 'Story Points',
                    data: developers.map(dev => individualData[dev].completed_points),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)'
                }, {
                    label: 'Horas',
                    data: developers.map(dev => individualData[dev].total_hours),
                    borderColor: 'rgba(255, 205, 86, 1)',
                    backgroundColor: 'rgba(255, 205, 86, 0.2)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderIndividualMetricsTable(data) {
        const container = $('#individual-metrics-table');
        container.empty();
        
        const individualData = aggregateIndividualData(data);
        const sortedDevelopers = Object.entries(individualData)
            .sort((a, b) => b[1].completed_points - a[1].completed_points);
        
        let table = `
            <table class="striped responsive-table">
                <thead>
                    <tr>
                        <th>Desarrollador</th>
                        <th>Story Points Completados</th>
                        <th>Horas Trabajadas</th>
                        <th>Eficiencia (SP/Hora)</th>
                        <th>Tareas Completadas</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedDevelopers.forEach(([developer, data]) => {
            const efficiency = data.total_hours > 0 ? (data.completed_points / data.total_hours).toFixed(2) : '0';
            
            table += `
                <tr>
                    <td>${developer}</td>
                    <td>${data.completed_points}</td>
                    <td>${data.total_hours.toFixed(1)}</td>
                    <td>${efficiency}</td>
                    <td>${data.completed_tasks}</td>
                </tr>
            `;
        });
        
        table += '</tbody></table>';
        container.html(table);
    }

    function renderVelocityTrendChart(data) {
        const ctx = document.getElementById('velocity-trend-chart').getContext('2d');
        
        if (charts.velocityTrend) {
            charts.velocityTrend.destroy();
        }
        
        charts.velocityTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.sprints.map(s => s.name),
                datasets: [{
                    label: 'Velocity',
                    data: data.sprints.map(s => s.completed_points),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function renderEstimationTrendChart(data) {
        const ctx = document.getElementById('estimation-trend-chart').getContext('2d');
        
        if (charts.estimationTrend) {
            charts.estimationTrend.destroy();
        }
        
        const accuracyData = data.sprints.map(sprint => calculateEstimationAccuracy(sprint));
        
        charts.estimationTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.sprints.map(s => s.name),
                datasets: [{
                    label: 'Precisión de Estimaciones (%)',
                    data: accuracyData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    function renderConsistencyChart(data) {
        const ctx = document.getElementById('consistency-chart').getContext('2d');
        
        if (charts.consistency) {
            charts.consistency.destroy();
        }
        
        // Calcular consistencia basada en la variación de velocity
        const velocities = data.sprints.map(s => s.completed_points);
        const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
        const consistency = Math.max(0, 100 - (Math.sqrt(variance) / avgVelocity * 100));
        
        charts.consistency = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Consistencia', 'Variabilidad'],
                datasets: [{
                    data: [consistency, 100 - consistency],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 99, 132, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    // Funciones auxiliares
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }

    function hideAllSections() {
        $('#executive-summary, #team-metrics, #individual-metrics, #trends-analysis, #recommendations, #download-section').hide();
    }

    function generateInsights(data) {
        const insights = [];
        
        // Velocity insights
        const velocities = data.sprints.map(s => s.completed_points);
        const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const latestVelocity = velocities[velocities.length - 1];
        
        if (latestVelocity < avgVelocity * 0.8) {
            insights.push({
                type: 'alert',
                title: '⚠️ Velocity Baja',
                description: `El último sprint tuvo una velocity de ${latestVelocity} SP, ${((avgVelocity - latestVelocity) / avgVelocity * 100).toFixed(1)}% por debajo del promedio.`
            });
        } else if (latestVelocity > avgVelocity * 1.2) {
            insights.push({
                type: 'success',
                title: '🚀 Velocity Excelente',
                description: `El último sprint superó el promedio en ${((latestVelocity - avgVelocity) / avgVelocity * 100).toFixed(1)}%.`
            });
        }
        
        // Bugs ratio insights
        const latestSprint = data.sprints[data.sprints.length - 1];
        const bugsRatio = (latestSprint.issue_type_distribution.Bug || 0) / 
            ((latestSprint.issue_type_distribution.Story || 0) + (latestSprint.issue_type_distribution.Task || 0));
        
        if (bugsRatio > 0.25) {
            insights.push({
                type: 'alert',
                title: '🐛 Alto Ratio de Bugs',
                description: `El ${(bugsRatio * 100).toFixed(1)}% de las tareas son bugs. Considera mejorar la calidad del código.`
            });
        }
        
        // Support ratio insights
        const supportRatio = (latestSprint.issue_type_distribution.Support || 0) / 
            ((latestSprint.issue_type_distribution.Story || 0) + (latestSprint.issue_type_distribution.Task || 0));
        
        if (supportRatio > 0.30) {
            insights.push({
                type: 'alert',
                title: '🆘 Alto Ratio de Support',
                description: `El ${(supportRatio * 100).toFixed(1)}% de las tareas son support. Considera revisar la carga de trabajo de soporte.`
            });
        }
        
        return insights;
    }

    function generateRecommendations(data) {
        const recommendations = [];
        
        // Analizar velocity
        const velocities = data.sprints.map(s => s.completed_points);
        const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
        const latestVelocity = velocities[velocities.length - 1];
        
        if (latestVelocity < avgVelocity * 0.8) {
            recommendations.push({
                priority: 'high',
                title: 'Revisar Capacity Planning',
                description: 'La velocity ha bajado significativamente.',
                suggestion: 'Analiza si hay impedimentos, scope creep, o problemas de estimación.'
            });
        }
        
        // Analizar estimaciones
        const estimationAccuracy = data.sprints.map(sprint => calculateEstimationAccuracy(sprint));
        const avgAccuracy = estimationAccuracy.reduce((a, b) => a + b, 0) / estimationAccuracy.length;
        
        if (avgAccuracy < 70) {
            recommendations.push({
                priority: 'medium',
                title: 'Mejorar Proceso de Estimación',
                description: `La precisión promedio de estimaciones es del ${avgAccuracy.toFixed(1)}%.`,
                suggestion: 'Implementa planning poker y mejora la definición de criterios de estimación.'
            });
        }
        
        return recommendations;
    }

    function calculateEstimationAccuracy(sprint) {
        const estimations = sprint.estimation_analysis.filter(e => e.analysis);
        if (estimations.length === 0) return 0;
        
        const correct = estimations.filter(e => e.analysis === 'Correcto').length;
        return (correct / estimations.length) * 100;
    }

    function aggregateIndividualData(data) {
        const individualData = {};
        
        data.sprints.forEach(sprint => {
            // Reconstruir métricas individuales desde detailed_issues
            const developerMetrics = {};
            
            sprint.detailed_issues.forEach(issue => {
                const assignee = issue.assignee;
                if (assignee) {
                    if (!developerMetrics[assignee]) {
                        developerMetrics[assignee] = {
                            completed_points: 0,
                            total_hours: 0,
                            completed_tasks: 0
                        };
                    }
                    
                    developerMetrics[assignee].total_hours += issue.time_spent;
                    
                    if (issue.status === 'Done' || issue.status === 'For Release' || issue.status === 'CODE REVIEW') {
                        developerMetrics[assignee].completed_points += issue.story_points;
                        developerMetrics[assignee].completed_tasks += 1;
                    }
                }
            });
            
            // Agregar al total
            Object.keys(developerMetrics).forEach(developer => {
                if (!individualData[developer]) {
                    individualData[developer] = {
                        completed_points: 0,
                        total_hours: 0,
                        completed_tasks: 0
                    };
                }
                
                individualData[developer].completed_points += developerMetrics[developer].completed_points;
                individualData[developer].total_hours += developerMetrics[developer].total_hours;
                individualData[developer].completed_tasks += developerMetrics[developer].completed_tasks;
            });
        });
        
        return individualData;
    }

    function downloadComparativeAnalysis(format) {
        const sprintIds = selectedSprints.join(',');
        const url = format === 'xlsx' 
            ? `/api/metrics/comparative/download_xlsx?sprint_ids=${sprintIds}`
            : `/api/metrics/comparative/download_csv?sprint_ids=${sprintIds}`;
        
        window.location.href = url;
    }
}); 