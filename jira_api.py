import requests
from requests.auth import HTTPBasicAuth
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import pytz
from config import JIRA_URL, JIRA_USER, JIRA_API_TOKEN

# Usar las variables de configuración
URL = JIRA_URL
auth = HTTPBasicAuth(JIRA_USER, JIRA_API_TOKEN)

def get_projects():
    url = f"{URL}/rest/api/3/project"
    response = requests.get(url, auth=auth)
    projects = response.json()
    projects.sort(key=lambda x: x['id'], reverse=True)
    return projects

def get_boards_for_project(project_id):
    url = f"{URL}/rest/agile/1.0/board?projectKeyOrId={project_id}"
    response = requests.get(url, auth=auth)
    if response.status_code != 200:
        response.raise_for_status()
    boards = response.json()
    return boards['values']

def get_sprints_for_board(board_id):
    url = f"{URL}/rest/agile/1.0/board/{board_id}/sprint"
    response = requests.get(url, auth=auth)
    if response.status_code != 200:
        response.raise_for_status()
    sprints = response.json()
    return sprints['values']

def get_sprints():
    url = f"{URL}/rest/agile/1.0/board/{BOARD_ID}/sprint"
    response = requests.get(url, auth=auth)
    sprints = response.json()['values']
    sprints.sort(key=lambda x: x['startDate'], reverse=True)
    return sprints

def get_issues_in_sprint(sprint_id):
    url = f"{URL}/rest/agile/1.0/sprint/{sprint_id}/issue?startAt=0&maxResults=500&expand=fields,changelog"
    response = requests.get(url, auth=auth)
    issues = response.json()['issues']
    for issue in issues:
        issue_type = issue['fields']['issuetype']
        issue_type['iconUrl'] = issue_type['iconUrl']
        story_points = issue['fields'].get('customfield_10016')        
        if story_points is not None:
            issue['fields']['customfield_10016'] = float(story_points)
        else:
            issue['fields']['customfield_10016'] = 0.0
    return issues

def get_worklogs(issue_id):
    url = f"{URL}/rest/api/3/issue/{issue_id}/worklog"
    response = requests.get(url, auth=auth)
    worklogs = response.json()['worklogs']
    for worklog in worklogs:
        worklog['authorAvatar'] = worklog['author']['avatarUrls']['48x48']
    return worklogs

def convert_time_to_hours(time_spent):
    time_units = {
        'd': 8,
        'h': 1,
        'm': 1 / 60
    }
    total_hours = 0
    for part in time_spent.split():
        unit = part[-1]
        value = float(part[:-1])
        total_hours += value * time_units[unit]
    return total_hours

def filter_worklogs_by_sprint(worklogs, sprint_start, sprint_end):
    filtered_worklogs = []
    for worklog in worklogs:
        worklog_date = datetime.strptime(worklog['started'], '%Y-%m-%dT%H:%M:%S.%f%z')
        if sprint_start <= worklog_date <= sprint_end:
            filtered_worklogs.append(worklog)
    return filtered_worklogs

def format_date_to_utc3(date_str):
    """Convierte una fecha UTC a UTC-3 y la formatea."""
    if not date_str:
        return ''
    utc = pytz.UTC
    utc_minus_3 = pytz.timezone('America/Montevideo')
    date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%f%z')
    date_utc3 = date.astimezone(utc_minus_3)
    return date_utc3.strftime('%Y-%m-%d %H:%M:%S')

def get_sprint_details(sprint_id):
    url = f"{URL}/rest/agile/1.0/sprint/{sprint_id}"
    response = requests.get(url, auth=auth)
    sprint = response.json()
    # Convertir fechas a UTC-3
    sprint['startDate'] = format_date_to_utc3(sprint.get('startDate'))
    sprint['endDate'] = format_date_to_utc3(sprint.get('endDate'))
    sprint['completeDate'] = format_date_to_utc3(sprint.get('completeDate'))
    return sprint

def get_issues_with_details(sprint_id):
    issues = get_issues_in_sprint(sprint_id)
    sprint_details = get_sprint_details(sprint_id)
    
    # Convertir las fechas de string a datetime objetos en UTC-3
    sprint_start = datetime.strptime(sprint_details['startDate'], '%Y-%m-%d %H:%M:%S')
    sprint_end = datetime.strptime(sprint_details['endDate'], '%Y-%m-%d %H:%M:%S')
    tz = pytz.timezone('America/Sao_Paulo')
    sprint_start = tz.localize(sprint_start)
    sprint_end = tz.localize(sprint_end)
    
    with ThreadPoolExecutor() as executor:
        futures = {executor.submit(get_worklogs, issue['id']): issue for issue in issues}
        for future in futures:
            issue = futures[future]
            worklogs = future.result()
            filtered_worklogs = filter_worklogs_by_sprint(worklogs, sprint_start, sprint_end)
            for worklog in filtered_worklogs:
                worklog['timeSpentHours'] = convert_time_to_hours(worklog['timeSpent'])
            issue['worklogs'] = filtered_worklogs if filtered_worklogs else []
    return issues

def get_sprint_name(sprint_id):
    url = f"{URL}/rest/agile/1.0/sprint/{sprint_id}"
    response = requests.get(url, auth=auth)
    sprint = response.json()
    return sprint['name']

def get_task_summary(issues):
    task_summary = {}
    for issue in issues:
        issue_type = issue['fields']['issuetype']['name']
        if issue_type not in task_summary:
            task_summary[issue_type] = {'count': 0, 'total_hours': 0}
        task_summary[issue_type]['count'] += 1
        for worklog in issue['worklogs']:
            task_summary[issue_type]['total_hours'] += worklog['timeSpentHours']
    return task_summary
