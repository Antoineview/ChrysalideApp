import dominate
import json
import jsonschema
import mistune
import os
import re
import subprocess
import yaml

from datetime import datetime

from dominate.tags import *
from dominate.util import raw

from jsonschema import RefResolver


formatting = {
    'css': {
        'default': [
            './www/css/bootstrap.min.css',
            './www/css/syllabus.css',
        ],
    },
    'js': {
        'default': [
            './www/js/bootstrap.bundle.min.js',
        ],
    }
}


def load_ressources(mapping: dict) -> None:
    for kind in mapping:
        for group in mapping[kind]:
            loaded = []
            for file in mapping[kind][group]:
                with open(file, 'r') as f:
                    loaded.append(f.read())
            mapping[kind][group] = loaded


def load_yaml(filepath: str, schema: str):
    root_directory = os.path.dirname(__file__)
    schema_directory = os.path.join(root_directory, 'templates/schemata/')
    resolver = RefResolver(base_uri=f'file://{schema_directory}', referrer={})

    with open(filepath) as data:
        data = yaml.safe_load(data)
    js = json.loads(json.dumps(data))
    with open(os.path.join(schema_directory, schema)) as template:
        schema = json.load(template)

    jsonschema.validate(js, schema, resolver=resolver)

    return data


def separate():
    br()
    hr()
    br()


def load_mapping():
    with open('templates/mapping.yml', 'r') as f:
        data = yaml.safe_load(f.read())
    return data


def plain(content: str):
    tags = '<(?:' + '|'.join([
        r'a', r'a\s+href=.*',  # html link
        r'img',  # images
        r'i', r'em',  # italic, emphasis
        r'b', r'strong',  # bold, strong
        r'p',  # paragraph
        r'u',  # underline
        r'h[1-6]',  # headers
        r'ul', r'ol', r'li',  # list, numbered or not
        r'br', r'hr',  # new-line,
        r'code', r'pre', r'pre\s+class=.*',  # code inline or pre-formatted
        r'table', r'th', r'tr', r'td',  # tables
        r'sup', r'sub',  # up and down text
    ]) + ')>'

    result = []
    for line in content.splitlines():
        for tag in re.findall(r'<[^/ ][^><]*>', line):
            if 0 == len(re.findall(tags, tag)):
                line = re.sub(tag, re.sub('<', '&lt;', re.sub('>', '&gt;', tag)), line)
        result.append(f'{line}  ')

    data = '\n'.join(result)
    data = mistune.html(data)
    data = re.sub(r'</?p>', '', data)

    return raw(data)


def build_ecue(filepath: str, mapping: dict):
    content = load_yaml(filepath, 'ecue.json')
    # _uid = str(uuid.uuid4())
    _uid = f"uid-ecue-{content['information']['ecue']['code']}"

    _hours = {
        'lecture': 0.0,
        'remediation': 0.0,
        'tutorial': 0.0,
        'practical': 0.0,
        'personnal': 0.0,
        'exam': 0.0,
    }

    _grade = {}

    _ecue = div(cls='card container tab-pane fade', id=f'div-{_uid}', role='tabpanel', aria_labelledby=f'tab-{_uid}')
    with _ecue:
        with div(cls='row'):
            with div(cls='col-12', style='padding: 0'):
                div([content['information']['ecue']['label'], code(['[', content['information']['ecue']['code'], ']'])], cls='card-header h3')
        br()
        with div(cls='row overflow-auto', style="height: 80vh; overflow-y: scroll;"):
            with div(cls='col-8', style='padding: 32px;'):

                if 'prerequisites' in content:
                    div('Prérequis', cls='card-title h4')
                    with div(cls='card-text'):
                        with ul():
                            for item in content['prerequisites']:
                                li(plain(item))
                    separate()

                div('Résumé', cls='card-title h4')
                div(plain(content['summary']), cls='card-text')
                separate()

                if 'outline' in content:
                    div('Plan du cours', cls='card-title h4')
                    div(plain(content['outline']), cls='card-text')
                    separate()

                div("Acquis d'Apprentissage Visés", cls='card-title h4')
                with div(cls='card-text'):
                    p("À l'issue de cet ECUE, les étudiants sont capables de :")
                    div(plain(content['tlo']), cls='card-text')
                separate()

                div('Format des activités', cls='card-title h4')
                with div(cls='card-text'):
                    with ul():
                        for item in content['activities']:
                            if 'label' in item:
                                li(plain(item['label']))
                            _hours[item['kind']] += _hours[item['kind']] + item['hours']
                separate()

                div('Évaluation(s)', cls='card-title h4')
                with table(cls='table table-bordered'):
                    with thead(cls='table-light'):
                        with tr():
                            td('Nom')
                            td('Type')
                            td('Environnement')
                            td('Code')
                            td('Commentaires')
                    with tbody():
                        for item in content['evaluations']:
                            tr([
                                td(item['label']),
                                td(mapping[item['kind']]),
                                td(mapping[item['environment']]),
                                td(code(f'[{item["code"]}]')),
                                td(item['comments'] if 'comments' in item else '')
                            ])
                            _grade[item['code']] = item['coefficient']
                            _hours['exam'] += item['hours']
                br()
                div('Calcul de la note finale', cls='card-title h4')
                grade = [code(f'[Note Finale]'), ' = ']
                for idx, item in enumerate(_grade):
                    if 0 != idx:
                        grade.append(' + ')
                    grade.append(f' {_grade[item]:.0%} ')
                    grade.append(code(f'[{item}]'))
                div(grade, cls='card-text')

                if 'references' in content:
                    separate()
                    div('Références et bibliographie', cls='card-title h4')
                    with div(cls='card-text'):
                        with ul():
                            for item in content['references']:
                                match item['kind']:
                                    case 'link':
                                        li(a(item['label'], href=item['url'], target='_blank'))
                                    case 'book':
                                        li([item['label'], ' (', a(item['isbn-13'], href=f'https://www.google.com/search?q={item["isbn-13"]}', target='_blank'), ' )'])
                                    case 'other':
                                        li(item['label'])

                if 'others' in content:
                    separate()
                    div('Informations complémentaires', cls='card-title h4')
                    with div(cls='card-text'):
                        plain(content['others'])

            with div(cls='col-4', style='padding-right: 32px;'):
                with div(cls='ecue-details sticky-top'):
                    with table(cls='table table-bordered', style='vertical-align: middle;'):
                        with tbody():
                            with tr(cls='table-light fw-bold'):
                                td('Informations', colspan='2')
                            with tr():
                                td('UE', cls='fw-bold')
                                td([content['information']['ue']['label'], br(), code(f"[{content['information']['ue']['code']}]")])
                            with tr():
                                td('ECUE', cls='fw-bold')
                                td([content['information']['ecue']['label'], br(), code(f"[{content['information']['ecue']['code']}]")])
                            with tr():
                                td("Coefficient dans l'UE", cls='fw-bold')
                                td(code(content['information']['ecue']['coefficient']))
                            with tr():
                                td('Note seuil', cls='fw-bold')
                                td(code(content['information']['ecue']['threshold']))
                    with table(cls='table table-bordered'):
                        with tbody():
                            with tr(cls='table-light fw-bold'):
                                td('Référent' if 1 == len(content['information']['referents']) else 'Référents')
                            with tr():
                                with td():
                                    with ul():
                                        for item in content['information']['referents']:
                                            li(item)
                    with table(cls='table table-bordered'):
                        with tbody():
                            with tr(cls='table-light fw-bold'):
                                td('Répartition du volume horaire attendu', colspan='2')

                            for k in _hours:
                                if _hours[k] > 0:
                                    with tr():
                                        td(mapping[k])
                                        td(code(f'{_hours[k]} h'), style='text-align: right;')

                            with tr(cls='table-light fw-bold'):
                                td('Total')
                                td(code(f'{_hours["lecture"]+_hours["remediation"]+_hours["tutorial"]+_hours["practical"]+_hours["personnal"]+_hours["exam"]} h'), style='text-align: right;')
                            with tr(cls='table-light'):
                                td(i('Dont face-à-face'))
                                td(code(f'{_hours["lecture"]+_hours["remediation"]+_hours["tutorial"]+_hours["practical"]+_hours["exam"]} h'), style='text-align: right;')
                    br()
                    br()

    return content['information']['ecue']['label'], _ecue, _uid, _hours


def build_navbar(syllabi, mapping, year, cycle):
    def list_ecue(sub_ue: dict):
        for _ecue in sorted(sub_ue):
            with li(cls='mb-1 ms-2 nav-item', role='presentation'):
                a(raw(sub_ue[_ecue]['label'] + ' <sup><b><code>[ECUE]</code></b></sup>'), cls='nav-link link-body-emphasis text-decoration-none rounded ecue d-block', type='button', role='tab', id=f'tab{sub_ue[_ecue]["uuid"]}', data_bs_target=f'#div-{sub_ue[_ecue]["uuid"]}', data_bs_toggle='tab', aria_selected='false', aria_controls=f'div-{sub_ue[_ecue]["uuid"]}')

    _year = year
    _cycle = cycle

    navbar = div(cls="sticky-top overflow-auto d-flex mx-auto", style="height: 90vh; overflow-y: scroll;")
    with navbar:
        with ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1', role='tablist'):
            with li(cls='mb-1 nav-item', role='presentation'):
                a('Préambule', id=f'tab-00-{cycle}-SX-Preamble', cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed preambule nav-link active', data_bs_toggle='tab', data_bs_target=f'#div-00-{cycle}-SX-Preamble', aria_selected='true', aria_controls=f'div-00-{cycle}-SX-Preamble', role='tab', type='button')

            for _semester in sorted(syllabi):
                with li(cls='mb-1 ms-3'):
                    button(raw(mapping[_semester] + f'<sup><b><code>[{_semester}]</code></b></sup>'), cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed', data_bs_toggle='collapse', data_bs_target=f'#nav-{_year}-{_cycle}-{_semester}', aria_expanded="false")
                    with div(cls='collapse', id=f'nav-{_year}-{_cycle}-{_semester}').add(ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1')):

                        for _ue in sorted(syllabi[_semester]):
                            with li(cls='mb-1 ms-3'):
                                button(mapping[_ue], cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed', data_bs_toggle='collapse', data_bs_target=f'#nav-{_year}-{_cycle}-{_semester}-{_ue}', aria_expanded="false")
                                with div(cls='collapse', id=f'nav-{_year}-{_cycle}-{_semester}-{_ue}').add(ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1')):

                                    with li(cls='mb-1 ms-2 nav-item', role='presentation'):
                                        ue_code = f'{_year}-{_cycle}-{_semester}-{_ue}'
                                        a(raw(mapping[_ue] + ' <sup><b><code>[UE]</code></b></sup>'), id=f'tab-{ue_code}', cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed preambule nav-link', data_bs_toggle='tab', data_bs_target=f'#div-{ue_code}', aria_selected='false', aria_controls=f'div-{ue_code}', role='tab', type='button')

                                    for _sub_ue in sorted(syllabi[_semester][_ue]):
                                        if _sub_ue is not None:
                                            with li(cls='mb-1 ms-3'):
                                                button(mapping[_sub_ue], cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed', data_bs_toggle='collapse', data_bs_target=f'#nav-{_year}-{_cycle}-{_semester}-{_ue}-{_sub_ue}', aria_expanded="false")
                                                with div(cls='collapse', id=f'nav-{_year}-{_cycle}-{_semester}-{_ue}-{_sub_ue}').add(ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1')):
                                                    list_ecue(syllabi[_semester][_ue][_sub_ue])
                                        else:
                                            list_ecue(syllabi[_semester][_ue][_sub_ue])
            with li(cls='mb-1 nav-item', role='presentation'):
                a('Répartition volume horaire global', id='tab-stats', cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed preambule nav-link', data_bs_toggle='tab', data_bs_target='#div-stats', aria_selected='false', aria_controls='div-stats', role='tab', type='button')

    return navbar


def stats(syllabi, mapping, year, cycle):
    matrix = []
    stats_ue = {}
    _y = year
    _c = cycle

    print(syllabi)

    for _s in sorted(syllabi):
        if 0 != len(matrix):
            matrix.append(['SKIP', '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0])
        lec, rem, tut, pra, per, exa, tot, faf = 0, 0, 0, 0, 0, 0, 0, 0
        for _u in sorted(syllabi[_s]):
            ulec, urem, utut, upra, uper, uexa, utot, ufaf = 0, 0, 0, 0, 0, 0, 0, 0
            ecues = []
            for _e in sorted(syllabi[_s][_u]):
                for _d in sorted(syllabi[_s][_u][_e]):
                    f2f = syllabi[_s][_u][_e][_d]['hours']['lecture']+syllabi[_s][_u][_e][_d]['hours']['remediation']+syllabi[_s][_u][_e][_d]['hours']['tutorial']+syllabi[_s][_u][_e][_d]['hours']['practical']+syllabi[_s][_u][_e][_d]['hours']['exam']
                    matrix.append([
                        mapping[_y], mapping[_c], mapping[_s], mapping[_u],
                        syllabi[_s][_u][_e][_d]['label'],
                        syllabi[_s][_u][_e][_d]['hours']['lecture'],
                        syllabi[_s][_u][_e][_d]['hours']['remediation'],
                        syllabi[_s][_u][_e][_d]['hours']['tutorial'],
                        syllabi[_s][_u][_e][_d]['hours']['practical'],
                        syllabi[_s][_u][_e][_d]['hours']['personnal'],
                        syllabi[_s][_u][_e][_d]['hours']['exam'],
                        f2f + syllabi[_s][_u][_e][_d]['hours']['personnal'],
                        f2f,
                    ])
                    ulec += syllabi[_s][_u][_e][_d]['hours']['lecture']
                    urem += syllabi[_s][_u][_e][_d]['hours']['remediation']
                    utut += syllabi[_s][_u][_e][_d]['hours']['tutorial']
                    upra += syllabi[_s][_u][_e][_d]['hours']['practical']
                    uper += syllabi[_s][_u][_e][_d]['hours']['personnal']
                    uexa += syllabi[_s][_u][_e][_d]['hours']['exam']
                    utot += f2f + syllabi[_s][_u][_e][_d]['hours']['personnal']
                    ufaf += f2f
                    ecues.append({'label': syllabi[_s][_u][_e][_d]['label'], 'code': syllabi[_s][_u][_e][_d]['code']})
            stats_ue[f'{_y}-{_c}-{_s}-{_u}'] = {'ecues': ecues, 'lecture': ulec, 'remediation': urem, 'tutorial': utut, 'practical': upra, 'personnal': uper, 'exam': uexa, 'total': utot, 'f2f': ufaf}
            matrix.append([
                mapping[_y], mapping[_c], mapping[_s], mapping[_u], 'Total UE', ulec, urem, utut, upra, uper, uexa, utot, ufaf
            ])
            lec += ulec
            rem += urem
            tut += utut
            pra += upra
            per += uper
            exa += uexa
            tot += utot
            faf += ufaf
        matrix.append([
            mapping[_y], mapping[_c], mapping[_s], 'Total Semestre', 'Total Semestre', lec, rem, tut, pra, per, exa, tot, faf
        ])

    rows, cols = len(matrix), len(matrix[0])
    merged = [[False] * cols for _ in range(rows)]

    recap = div(cls='tab-pane', role='tabpanel', id='div-stats', aria_labelledby='tab-stats')
    with recap:
        with div(cls='overflow-auto', style="height: 80vh; overflow-y: scroll;"):
            with table(cls='table table-bordered', style='vertical-align: middle;'):
                with thead():
                    with tr(cls='table-secondary fw-bold sticky-top'):
                        td('Semestre')
                        td('UE')
                        td('ECUE')

                        td(raw(mapping['lecture']), style='text-align: right')
                        td(raw(mapping['remediation']), style='text-align: right')
                        td(raw(mapping['tutorial']), style='text-align: right')
                        td(raw(mapping['practical']), style='text-align: right')
                        td(raw(mapping['personnal']), style='text-align: right')
                        td(raw(mapping['exam']), style='text-align: right')
                        td(raw(mapping['total']), style='text-align: right')
                        td(raw(mapping['f2f']), style='text-align: right')
                with tbody():
                    for idx, line in enumerate(matrix):
                        with tr():
                            cstyle = None
                            if 'SKIP' == line[0]:
                                td(colspan='11', style='border-left: none; border-right: none; background-color: #00000000;')
                                continue
                            for idy, item in enumerate(line):
                                if idy < 2:
                                    continue
                                if 3 == idy and item.startswith('Total') and cstyle is None:
                                    cstyle = 'background-color: #B70D7F33; font-weight: bold; '
                                if 4 == idy and item.startswith('Total') and cstyle is None:
                                    cstyle = 'background-color: #B70D7F11; font-style: italic; '
                                if idy > 4:
                                    if cstyle is None:
                                        cstyle = "background-color: #FDFDFD; " if idx % 2 == 0 else "background-color: #FFFFFF; "
                                    td(item if item > 0 else '', style=f'text-align: right; {cstyle};')
                                elif not merged[idx][idy]:
                                    value, rowspan, colspan = matrix[idx][idy], 1, 1
                                    while idx + rowspan < rows and matrix[idx + rowspan][idy] == value:
                                        rowspan += 1
                                    while idy + colspan < cols and matrix[idx][idy + colspan] == value:
                                        colspan += 1
                                    for mr in range(rowspan):
                                        for mc in range(colspan):
                                            merged[idx + mr][idy + mc] = True
                                    td(raw(item), colspan=(f'{colspan}' if colspan > 1 else ''), rowspan=(f'{rowspan}' if rowspan > 1 else ''), style=('' if idy < 3 else f'{cstyle if cstyle is not None else ""};'), cls='table-secondary' if idy < 3 else '')
    return recap, stats_ue


def build_ue(ue: dict, semester: str, mapping: dict, stats_ue, ues_data):
    data = ue['content']
    uid = ue['code']

    preamble = re.match('.*Preamble', uid)

    ue = div(cls=f'card container tab-pane fade {"show active" if preamble else ""}', id=f'div-{uid}', aria_labelledby=f'tab-{uid}')

    with ue:
        with div(cls='row'):
            with div(cls='col-12', style='padding: 0'):
                if preamble:
                    ue_title = 'Préambule'
                else:
                    ue_title = [data['information']['label'], ' [',  code(data['information']['code']), ']']
                div(ue_title, cls='card-header h3')
        br()
        with div(cls='row overflow-auto', style="height: 80vh; overflow-y: scroll;"):
            with div(cls='col-8', style='padding: 32px;'):
                div(raw(mistune.html(data['content'])))

            if 'information' in data:
                with div(cls='col-4', style='padding-right: 32px;'):
                    with div(cls='ecue-details sticky-top'):
                        with table(cls='table table-bordered', style='vertical-align: middle;'):
                            with tbody():
                                with tr(cls='table-light fw-bold'):
                                    td('Informations', colspan='2')
                                with tr():
                                    td('Niveau', cls='fw-bold')
                                    td(code(data['information']['level']))
                                with tr():
                                    td('Semestre', cls='fw-bold')
                                    td(code(data['information']['semester']))
                                with tr():
                                    td('ECTS', cls='fw-bold')
                                    td(code(data['information']['ects']))
                                with tr():
                                    td('Coordinateur', cls='fw-bold')
                                    td(code(data['information']['coordinator']))
                        with table(cls='table table-bordered'):
                            with tbody():
                                with tr(cls='table-light fw-bold'):
                                    td('Répartition du volume horaire attendu', colspan='2')
                                for k in ['lecture', 'remediation', 'tutorial', 'practical', 'personnal', 'exam', 'total', 'f2f']:
                                    if stats_ue[data['information']['code']][k] > 0:
                                        with tr(cls=(('' if k not in ['total', 'f2f'] else 'table-light ') + 'fw-bold' if k == 'total' else '')):
                                            td(raw(mapping[k]))
                                            td(code(f'{stats_ue[data["information"]["code"]][k]} h'), style='text-align: right;')
                        with table(cls='table table-bordered'):
                            with tbody():
                                with tr(cls='table-light fw-bold'):
                                    td('Liste des ECUE', colspan='2')
                                for k in sorted(stats_ue[data["information"]["code"]]['ecues'], key=lambda x: x['code']):
                                    with tr(style='vertical-align: middle; '):
                                        td(code(f'[{k["code"]}]'), cls='w-50')
                                        td(k["label"], cls='w-50')
                br()
                br()

            if preamble:
                with div(cls='col-4', style='padding-right: 32px;'):
                    with div(cls='ecue-details sticky-top'):
                        for _s in sorted(ues_data):
                            if 'SX' == _s:
                                continue
                            with table(cls='table table-bordered', style='vertical-align: middle;'):
                                with tbody():
                                    with tr(cls='table-light fw-bold'):
                                        td([raw(f'ECTS - {mapping[_s]}'), code(f'[{_s}]')], colspan='2')
                                    for _ue in sorted(ues_data[_s], key=lambda x: x['code']):
                                        with tr():
                                            td([mapping[_ue['clabel']], code(f"[{_ue['code']}]")])
                                            td(code(_ue['content']['information']['ects']), cls='fw-bold')
                br()
                br()

    return ue


def build_ues(mapping, stats_ue, year, cycle):
    files = subprocess.run(['find', '-L', f'src/{year}/{cycle}', '-name', '[0-9]*.yml'], stdout=subprocess.PIPE).stdout.decode('utf-8').splitlines()
    ues_data = {}
    for file in files:
        print(f'processing UE: {file}')
        ue = file.split('/')[-1].split('.')[0]
        _, _, _s, _c = ue.split('-')
        add(ues_data, _s, [])
        with open(file, 'r') as f:
            data = f.read()
        data = yaml.safe_load(data)
        ues_data[_s].append({'file': file, 'content': data, 'code': ue, 'clabel': _c})

    ues = []
    for _s in ues_data:
        for _ue in ues_data[_s]:
            ues.append(build_ue(_ue, _s, mapping, stats_ue, ues_data))
    return ues


def build_syllabus(syllabi, mapping, year, cycle):
    navbar = build_navbar(syllabi, mapping, year, cycle)

    stitle = f'EPITA - Syllabus - Cycle Préparatoire - {mapping[cycle]}'

    doc = dominate.document(title=stitle)
    doc['lang'] = 'fr'
    with doc.head:
        meta(http_equiv='Content-Type', content='text/html; charset=utf-8')
        meta(name='language', content='fr')
        meta(name='title', content=stitle)
        style(raw(formatting['css']['default'][0]))
        style(raw(formatting['css']['default'][1]))

    doc.body['class'] = 'bg-light'
    with doc.body:
        with div(cls='container'):
            with div(cls='row'):
                with div(cls='col-12'):
                    with open('./www/img/logo/epita.svg', 'r') as f:
                        data = f.read()
                    w = re.search('width="([^\"]*)"', data).group(1)
                    h = re.search('height="([^\"]*)"', data).group(1)
                    data = re.sub('width="[^\"]*"', f'viewBox="0 0 {w} {h}"', data)
                    data = re.sub('height="[^\"]*"', '', data)
                    h2([
                        div(raw(data), style='width: 64px; height: 43px;'),
                        div(style='width: 32px;'),
                        span([stitle, ' ', code(f'(v{datetime.now().strftime("%Y-%m-%d %H:%M:%S")})'), ' [DRAFT FOR TEST]'], style='color: #102b65;')
                    ], style='display: flex')
            br()
            with div(cls='row'):
                div(navbar, cls='col-3')

                with div(cls='col-9'):
                    ecues = []
                    _y = year
                    _c = cycle
                    for _s in syllabi:
                        for _u in syllabi[_s]:
                            for _e in syllabi[_s][_u]:
                                for _d in syllabi[_s][_u][_e]:
                                    ecues.append(syllabi[_s][_u][_e][_d]['content'])

                    stats_global, stats_ue = stats(syllabi, mapping, year, cycle)
                    ecues.append(stats_global)

                    ecues.extend(build_ues(mapping, stats_ue, year, cycle))

                    div(ecues, cls='tab-content', style='padding-right: 32px')

        script(raw(formatting['js']['default'][0]))

    os.makedirs(f'public/fr/{year}/{cycle.lower()}', exist_ok=True)
    with open(f'public/fr/{year}/{cycle.lower()}/index.html', 'w') as f:
        f.write(str(doc))


def add(dictionnary: dict, key: str, default: any):
    if key not in dictionnary:
        dictionnary[key] = default


def main():
    load_ressources(formatting)
    _mapping = load_mapping()

    _syllabi = {}
    files = subprocess.run(['find', '-L', f'src', '-name', '[^0-9]*.yml'], stdout=subprocess.PIPE).stdout.decode('utf-8').splitlines()
    for file in files:
        print(f'processing ECUE: {file}', end='')
        _, _y, _c, _ue, _ecue = file.split('/')
        _year, _cycle, _semester, _id = _ue.split('-')
        if _y != _year:
            print(f' !year {_y} vs {_year}', end='')
            _year = _year
        if _c != _cycle:
            print(f' !cycle {_c} vs {_cycle}', end='')
            _cycle = _c
        _ecue = _ecue.split('.')[0]
        __ecue = _ecue.split('-')
        if 4 == len(__ecue):
            __ecue.insert(2, None)
        _, _, __sub_ue, __order, __ecue_tag = __ecue

        add(_syllabi, _year, {})
        add(_syllabi[_year], _cycle, {})
        add(_syllabi[_year][_cycle], _semester, {})
        add(_syllabi[_year][_cycle][_semester], _id, {})

        add(_syllabi[_year][_cycle][_semester][_id], __sub_ue, {})
        add(_syllabi[_year][_cycle][_semester][_id][__sub_ue], __order, None)

        _label, _content, _uuid, _hours = build_ecue(file, _mapping)

        _syllabi[_year][_cycle][_semester][_id][__sub_ue][__order] = {'code': _ecue, 'ue': _ue, 'label': _label, 'file': file, 'content': _content, 'uuid': _uuid, 'hours': _hours}
        print()

    for year in ['23']:
        for cycle in ['PC', 'PA']:
            build_syllabus(_syllabi[next(iter(_syllabi))][cycle], _mapping, year, cycle)


if __name__ == '__main__':
    main()
