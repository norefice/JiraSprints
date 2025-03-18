from flask import Flask, render_template, jsonify, send_file
from jira_api import get_sprints, get_issues_with_details, get_sprint_details, get_sprint_name, get_task_summary, get_projects, get_boards_for_project, get_sprints_for_board, URL
from openpyxl import Workbook
from io import BytesIO
from datetime import datetime
import pytz

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/projects')
def api_projects():
    projects = get_projects()
    return jsonify(projects)

@app.route('/api/projects/<int:project_id>/boards')
def api_project_boards(project_id):
    boards = get_boards_for_project(project_id)
    return jsonify(boards)

@app.route('/api/boards/<int:board_id>/sprints')
def api_board_sprints(board_id):
    sprints = get_sprints_for_board(board_id)
    return jsonify(sprints)

@app.route('/api/sprints')
def api_sprints():
    sprints = get_sprints()
    return jsonify(sprints)

@app.route('/api/sprints/<int:sprint_id>/details')
def api_sprint_details(sprint_id):
    sprint_details = get_sprint_details(sprint_id)
    issues = get_issues_with_details(sprint_id)
    task_summary = get_task_summary(issues)
    return jsonify({'sprint': sprint_details, 'issues': issues, 'task_summary': task_summary})

@app.route('/api/sprints/<int:sprint_id>/issues/download')
def download_sprint_issues(sprint_id):
    issues = get_issues_with_details(sprint_id)
    sprint_name = get_sprint_name(sprint_id)
    wb = Workbook()

    # Hoja de Worklogs
    ws_worklogs = wb.active
    ws_worklogs.title = "Worklogs"
    ws_worklogs.append(["Task Key", "Summary", "Type", "User", "Time Spent (hours)", "Link"])

    for issue in issues:
        issue_key = issue['key']
        issue_summary = issue['fields']['summary']
        issue_type = issue['fields']['issuetype']['name']
        issue_link = f"{URL}/browse/{issue_key}"
        if issue['worklogs']:
            for worklog in issue['worklogs']:
                ws_worklogs.append([issue_key, issue_summary, issue_type, worklog['author']['displayName'], worklog['timeSpentHours'], issue_link])
        else:
            ws_worklogs.append([issue_key, issue_summary, issue_type, "", 0, issue_link])

    # Hoja de Issues
    ws_issues = wb.create_sheet(title="Issues")
    ws_issues.append(["Task Key", "Summary", "Status", "Story Points"])

    for issue in issues:
        issue_key = issue['key']
        issue_summary = issue['fields']['summary']
        issue_status = issue['fields']['status']['name']
        story_points = issue['fields'].get('customfield_10016', 0)
        ws_issues.append([issue_key, issue_summary, issue_status, story_points])

    file_stream = BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)

    return send_file(file_stream, as_attachment=True, download_name=f"{sprint_name}_worklogs.xlsx")

@app.route('/api/sprints/<int:sprint_id>/worklogs/download')
def download_sprint_worklogs(sprint_id):
    issues = get_issues_with_details(sprint_id)
    sprint_name = get_sprint_name(sprint_id)
    wb = Workbook()
    ws = wb.active
    ws.title = "Worklogs"
    
    # Encabezados
    headers = ["Task Key", "Summary", "Issue Type", "User", "Time Spent (hours)", "Link", "Started"]
    ws.append(headers)
    
    # Datos
    for issue in issues:
        if issue['worklogs']:
            for worklog in issue['worklogs']:
                ws.append([
                    issue['key'],
                    issue['fields']['summary'],
                    issue['fields']['issuetype']['name'],
                    worklog['author']['displayName'],
                    worklog['timeSpentHours'],
                    f"{URL}/browse/{issue['key']}",
                    worklog['started']
                ])
    
    # Ajustar ancho de columnas
    for column in ws.columns:
        max_length = 0
        column = list(column)
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[column[0].column_letter].width = adjusted_width

    file_stream = BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    return send_file(
        file_stream,
        as_attachment=True,
        download_name=f"{sprint_name}_detailed_worklogs.xlsx"
    )

def analyze_story_points_vs_time(story_points, time_spent):
    if story_points is None or story_points == 0:
        return ""
    
    # Definir rangos de horas para cada punto
    ranges = {
        1: (0, 2),
        2: (2, 4),
        3: (4, 8),
        5: (8, 16),
        8: (16, 24)
    }
    
    expected_range = ranges.get(story_points)
    if expected_range is None:
        return ""
    
    if time_spent < expected_range[0]:
        return "Sobre-estimado"
    elif time_spent > expected_range[1]:
        return "Sub-estimado"
    else:
        return "Correcto"

@app.route('/api/sprints/<int:sprint_id>/analysis/download')
def download_sprint_analysis(sprint_id):
    issues = get_issues_with_details(sprint_id)
    sprint_name = get_sprint_name(sprint_id)
    wb = Workbook()
    ws = wb.active
    ws.title = "Sprint Analysis"
    
    headers = [
        "Issue Type",
        "Issue Key",
        "Summary",
        "Assignee",
        "Status",
        "Time Spent",
        "Story Points",
        "Story Points vs Time",
        "Parent Summary",
        "Código Presupuesto"  # Nueva columna
    ]
    ws.append(headers)
    
    for issue in issues:
        issue_type = issue['fields']['issuetype']['name']
        issue_key = issue['key']
        summary = issue['fields'].get('summary', '')
        
        assignee = ''
        if issue['fields'].get('assignee'):
            assignee = issue['fields']['assignee'].get('displayName', '')
        
        status = issue['fields']['status']['name']
        time_spent = sum(worklog['timeSpentHours'] for worklog in issue['worklogs'])
        
        # Manejo explícito de Story Points usando el campo correcto
        story_points = issue['fields'].get('customfield_10030', 0)
        if story_points is not None:
            story_points = float(story_points)
        else:
            story_points = 0.0
            
        story_points_analysis = analyze_story_points_vs_time(story_points, time_spent)
        
        parent_summary = ""
        if issue['fields'].get('parent'):
            parent_fields = issue['fields']['parent'].get('fields', {})
            parent_summary = parent_fields.get('summary', '')
        
        # Obtener el código de presupuesto
        codigo_presupuesto = issue['fields'].get('customfield_10162', '')
        
        row = [
            issue_type,
            issue_key,
            summary,
            assignee,
            status,
            f"{time_spent:.2f}",
            f"{story_points:.1f}" if story_points > 0 else "",  # Mostrar vacío si es 0
            story_points_analysis,
            parent_summary,
            codigo_presupuesto  # Nuevo campo
        ]
        ws.append(row)

    # Ajustar ancho de columnas
    for column in ws.columns:
        max_length = 0
        column = list(column)
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = (max_length + 2)
        ws.column_dimensions[column[0].column_letter].width = adjusted_width

    file_stream = BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    return send_file(
        file_stream,
        as_attachment=True,
        download_name=f"{sprint_name}_sprint_analysis.xlsx"
    )

@app.route('/metrics')
def metrics_view():
    return render_template('metrics.html')

@app.route('/api/sprints/<int:sprint_id>/advanced-metrics')
def get_advanced_metrics(sprint_id):
    try:
        issues = get_issues_with_details(sprint_id)
        sprint_details = get_sprint_details(sprint_id)
        
        # Calcular la velocidad
        velocity = {
            'completed_points': sum(float(issue['fields'].get('customfield_10030', 0) or 0)
                                  for issue in issues 
                                  if issue['fields']['status']['name'] in ['Done', 'Closed']),
            'total_points': sum(float(issue['fields'].get('customfield_10030', 0) or 0)
                              for issue in issues)
        }

        # Calcular la eficiencia
        stories = [i for i in issues if i['fields']['issuetype']['name'] == 'Story']
        completed_stories = [i for i in stories if i['fields']['status']['name'] in ['Done', 'Closed']]
        
        efficiency = {
            'stories_completed': len(completed_stories),
            'total_stories': len(stories)
        }

        # Análisis de tiempo
        time_distribution = calculate_time_distribution(issues)

        # Rendimiento del equipo
        team_performance = {}
        for issue in issues:
            for worklog in issue.get('worklogs', []):
                author = worklog['author']['displayName']
                if author not in team_performance:
                    team_performance[author] = {'total_hours': 0, 'tasks_count': 0}
                team_performance[author]['total_hours'] += worklog['timeSpentHours']
                team_performance[author]['tasks_count'] += 1

        # Calcular promedio de horas por tarea para cada miembro
        for member in team_performance:
            stats = team_performance[member]
            stats['avg_hours_per_task'] = stats['total_hours'] / stats['tasks_count'] if stats['tasks_count'] > 0 else 0

        metrics = {
            'velocity': velocity,
            'efficiency': efficiency,
            'time_analysis': {
                'time_distribution': time_distribution,
                'average_task_completion': calculate_average_task_completion(issues)
            },
            'team_performance': team_performance,
            'scope_changes': {
                'added': 0,  # Estos valores se pueden calcular si tienes los campos necesarios en JIRA
                'removed': 0
            }
        }
        
        return jsonify(metrics)
    except Exception as e:
        print(f"Error calculating metrics: {str(e)}")
        return jsonify({'error': str(e)}), 500

def calculate_time_distribution(issues):
    status_mapping = {
        'TO DO': 'planning',
        'TODO': 'planning',
        'IN PROGRESS': 'development',
        'CODE REVIEW': 'review',
        'FOR RELEASE': 'completed',
        'DONE': 'completed',
    }
    
    distribution = {
        'planning': 0,
        'development': 0,
        'review': 0,
        'testing': 0,
        'completed': 0,
        'other': 0  # Agregamos 'other' como categoría válida
    }
    
    for issue in issues:
        current_status = issue['fields']['status']['name'].upper()
        mapped_status = status_mapping.get(current_status, 'other')
        
        for worklog in issue.get('worklogs', []):
            distribution[mapped_status] += worklog['timeSpentHours']
    
    # Solo incluir categorías con horas > 0
    return {k: v for k, v in distribution.items() if v > 0}

def calculate_average_task_completion(issues):
    completed_issues = [i for i in issues if i['fields']['status']['name'] in ['Done', 'Closed']]
    if not completed_issues:
        return 0
    
    total_days = 0
    count = 0
    
    for issue in completed_issues:
        if 'created' in issue['fields'] and 'resolutiondate' in issue['fields']:
            try:
                created = datetime.strptime(issue['fields']['created'].split('.')[0], '%Y-%m-%dT%H:%M:%S')
                resolved = datetime.strptime(issue['fields']['resolutiondate'].split('.')[0], '%Y-%m-%dT%H:%M:%S')
                days = (resolved - created).days
                if days >= 0:  # Ignorar valores negativos
                    total_days += days
                    count += 1
            except (ValueError, AttributeError):
                continue
    
    return total_days / count if count > 0 else 0

if __name__ == '__main__':
    app.run(debug=True)
