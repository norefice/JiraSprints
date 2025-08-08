const URL = "https://200software.atlassian.net";

let taskSummaryChart;
let taskHoursChart;

$(document).ready(function() {
    // Obtener y listar los proyectos
    $.get('/api/projects', function(data) {
        data.forEach(function(project) {
            $('#project-select').append(`<option value="${project.id}">${project.name}</option>`);
        });
    });

    // Manejar la selección de proyectos
    $('#project-select').change(function() {
        const projectId = $(this).val();
        $('#board-select').empty().append('<option value="" disabled selected>Choose your board</option>');
        $('#board-select').prop('disabled', false);
        $.get(`/api/projects/${projectId}/boards`, function(data) {
            data.forEach(function(board) {
                $('#board-select').append(`<option value="${board.id}">${board.name}</option>`);
            });
        });
    });

    // Manejar la selección de boards
    $('#board-select').change(function() {
        const boardId = $(this).val();
        $('#sprint-select').empty().append('<option value="" disabled selected>Choose your sprint</option>');
        $('#sprint-select').prop('disabled', false);
        $.get(`/api/boards/${boardId}/sprints`, function(data) {
            const today = new Date();
            // Filtrar sprints que ya han comenzado
            const validSprints = data.filter(sprint => {
                const startDate = new Date(sprint.startDate);
                return startDate <= today;
            });
            
            // Ordenar por fecha de inicio (más reciente primero)
            validSprints.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            
            // Mostrar todos los sprints
            validSprints.forEach(sprint => {
                const activeBadge = sprint.state === 'active' ? '<span class="new badge blue" data-badge-caption="Activo"></span>' : '';
                $('#sprint-select').append(`<option value="${sprint.id}">${sprint.name} ${activeBadge}</option>`);
            });
        });
    });

    $('#sprint-select').change(function() {
        const sprintId = $(this).val();
        $('#loading-spinner').show();
        $.get(`/api/sprints/${sprintId}/details`, function(data) {
            const sprint = data.sprint;
            const issues = data.issues;
            const taskSummary = data.task_summary;            

            $('#worklog-table-body').empty();
            $('#sprint-details').html(`
                <div class="card-panel cyan lighten-5">
                    <h5>Sprint Details</h5>
                    <p><strong>Name:</strong> ${sprint.name}</p>
                    <p><strong>Start Date:</strong> ${sprint.startDate}</p>
                    <p><strong>End Date:</strong> ${sprint.endDate}</p>
                    <p><strong>Status:</strong> ${sprint.state}</p>
                </div>
            `);

            issues.forEach(function(issue) {
                const issueLink = `${URL}/browse/${issue.key}`;
                const issueType = issue.fields.issuetype;
                const issueTypeIcon = `<img src="${issueType.iconUrl}" alt="${issueType.name}" class="circle avatar">`;
                const issueTypeColor = issueType.color;
                const issueStatus = issue.fields.status;
                const issueStatusColor = getStatusColor(issueStatus.name);
                const issueStatusLabel = `<span class="status-label ${issueStatusColor}">${issueStatus.name.toUpperCase()}</span>`;
                if (issue.worklogs.length > 0) {
                    issue.worklogs.forEach(function(worklog) {
                        $('#worklog-table-body').append(`
                            <tr style="background-color: ${issueTypeColor};">
                                <td>${issueTypeIcon} ${issue.key}</td>
                                <td>${issue.fields.summary}</td>
                                <td>
                                    <span class="chip">
                                        <img src="${worklog.authorAvatar}" alt="${worklog.author.displayName}" class="circle avatar">
                                        ${worklog.author.displayName}
                                    </span>
                                </td>
                                <td>${worklog.timeSpentHours}</td>
                                <td><a href="${issueLink}" target="_blank">Link</a></td>
                            </tr>
                        `);
                    });
                }
            });

            $('#task-summary-table-body').empty();
            const taskTypes = [];
            const taskCounts = [];
            const taskHours = [];
            if (taskSummary) {
                for (const [type, summary] of Object.entries(taskSummary)) {
                    $('#task-summary-table-body').append(`
                        <tr>
                            <td>${type}</td>
                            <td>${summary.count}</td>
                            <td>${summary.total_hours.toFixed(2)}</td>
                        </tr>
                    `);
                    taskTypes.push(type);
                    taskCounts.push(summary.count);
                    taskHours.push(summary.total_hours.toFixed(2));
                }
            }

            // Llenar la tabla de lista de tareas
            $('#task-list-table-body').empty();
            issues.forEach(function(issue) {
                const storyPoints = issue.fields.customfield_10030 || 0;  // Cambiado de customfield_10016
                const issueType = issue.fields.issuetype;
                const issueTypeIcon = `<img src="${issueType.iconUrl}" alt="${issueType.name}" class="circle avatar">`;
                const issueTypeColor = issueType.color;
                const issueStatus = issue.fields.status;
                const issueStatusColor = getStatusColor(issueStatus.name);
                const issueStatusLabel = `<span class="status-label ${issueStatusColor}">${issueStatus.name.toUpperCase()}</span>`;
                $('#task-list-table-body').append(`
                    <tr style="background-color: ${issueTypeColor};">
                        <td>${issueTypeIcon} ${issue.key}</td>
                        <td>${issue.fields.summary}</td>
                        <td>${issueStatusLabel}</td>
                        <td>${storyPoints}</td>
                    </tr>
                `);
            });

            // Destroy existing charts if they exist
            if (taskSummaryChart) {
                taskSummaryChart.destroy();
            }
            if (taskHoursChart) {
                taskHoursChart.destroy();
            }

            // Generate pie chart for task counts
            const ctx1 = document.getElementById('task-summary-chart').getContext('2d');
            taskSummaryChart = new Chart(ctx1, {
                type: 'pie',
                data: {
                    labels: taskTypes,
                    datasets: [{
                        data: taskCounts,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    return `${tooltipItem.label}: ${tooltipItem.raw}`;
                                }
                            }
                        }
                    }
                }
            });

            // Generate pie chart for task hours
            const ctx2 = document.getElementById('task-hours-chart').getContext('2d');
            taskHoursChart = new Chart(ctx2, {
                type: 'pie',
                data: {
                    labels: taskTypes,
                    datasets: [{
                        data: taskHours,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    return `${tooltipItem.label}: ${tooltipItem.raw} hours`;
                                }
                            }
                        }
                    }
                }
            });

            $('#loading-spinner').hide();
            $('#download-button').attr('href', `/api/sprints/${sprintId}/issues/download`).show();
            $('#download-buttons').show();
            $('#download-worklogs')
                .attr('onclick', `window.location.href='/api/sprints/${sprintId}/worklogs/download'`)
                .show();
            $('#download-sprint-analysis')
                .attr('onclick', `window.location.href='/api/sprints/${sprintId}/analysis/download'`)
                .show();
            $('#download-sprint-analysis-csv')
                .attr('onclick', `window.location.href='/api/sprints/${sprintId}/analysis/download_csv'`)
                .show();
        });
    });
});

function getStatusColor(status) {
    switch (status.toUpperCase()) {
        case 'TODO':
            return 'todo';
        case 'IN PROGRESS':
            return 'in-progress';
        case 'CODE REVIEW':
            return 'code-review';
        case 'FOR RELEASE':
            return 'for-release';
        case 'DONE':
        case 'COMPLETED':
            return 'done';
        case 'REJECTED':
            return 'rejected';
        case 'BLOCKED':
        case 'ERROR':
            return 'error';
        case 'WARNING':
            return 'warning';
        default:
            return 'grey';
    }
}
