from flask import Flask, render_template, jsonify, send_file
from jira_api import get_sprints, get_issues_with_details, get_sprint_details, get_sprint_name, get_task_summary, get_projects, get_boards_for_project, get_sprints_for_board, URL
from openpyxl import Workbook
from io import BytesIO

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

if __name__ == '__main__':
    app.run(debug=True)
