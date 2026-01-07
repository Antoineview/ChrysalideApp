from __future__ import annotations

import math

import dominate.util
import dominate.tags as dt
import dominate.util as du
import json
import jsonschema
import mistune
import os
import re
import subprocess
import yaml

from datetime import datetime
from jsonschema import RefResolver
from typing import Any


class Tools:
    mapping: dict[str, str]

    @staticmethod
    def load_mapping(filepath: str):
        with open(filepath, 'r') as f:
            Tools.mapping = yaml.safe_load(f.read())

    @staticmethod
    def tr(key: str) -> str:
        return Tools.mapping[key]

    @staticmethod
    def load_yaml(filepath: str, schema: str | None = None) -> Any:
        with open(filepath) as f:
            data = yaml.safe_load(f)
        if schema is not None:
            # TODO migrate to referencing
            root = os.path.dirname(__file__)
            schema_directory = os.path.join(root, 'templates/schemata/')
            resolver = RefResolver(base_uri=f'file://{schema_directory}', referrer={})
            jsdata = json.loads(json.dumps(data))
            with open(os.path.join(schema_directory, schema)) as template:
                schema = json.load(template)
            jsonschema.validate(jsdata, schema, resolver=resolver)
        return data

    @staticmethod
    def get_code(filepath: str):
        code = filepath.split('/')[-1].split('.')[0]
        if code == '':
            code = filepath.split('/')[-2]
        return code

    @staticmethod
    def store(syllabus: dict, value: Any, filepath: str) -> None:
        splits = ('.'.join(filepath.split('.')[:-1])).split('/')

        year = splits[1]
        cycle = splits[2]

        if year not in syllabus:
            syllabus[year] = {}
        if cycle not in syllabus[year]:
            syllabus[year][cycle] = {}

        ue = splits[3]
        if ue == '.preamble':
            syllabus[year][cycle]['preamble'] = value
            return
        semester = ue.split('-')[2]
        if semester not in syllabus[year][cycle]:
            syllabus[year][cycle][semester] = {}
        if ue not in syllabus[year][cycle][semester]:
            syllabus[year][cycle][semester][ue] = {}

        ecue = splits[4]
        if ecue == '.ue':
            syllabus[year][cycle][semester][ue]['preamble'] = value
            return

        syllabus[year][cycle][semester][ue][ecue] = value

    @staticmethod
    def load_ressources() -> dict[str, list[str]]:
        data = {'css': ['./www/css/bootstrap.min.css', './www/css/syllabus.css', './www/css/katex-fontless.css'],
                'js': ['./www/js/bootstrap.bundle.min.js', './www/js/katex.min.js', './www/js/auto-render.min.js']}
        for kind in data:
            loaded = []
            for file in data[kind]:
                with open(file, 'r') as f:
                    loaded.append(f.read())
            data[kind] = loaded
        return data

    @staticmethod
    def separate():
        return dt.br(), dt.hr(), dt.br()

    @staticmethod
    def plain(content: str):
        tags = '<(?:' + '|'.join([
            r'a', r'a\s+href=.*',                   # html link
            r'img',                                 # images
            r'i', r'em',                            # italic, emphasis
            r'b', r'strong',                        # bold, strong
            r'p',                                   # paragraph
            r'u',                                   # underline
            r'h[1-6]',                              # headers
            r'ul', r'ol', r'li',                    # list, numbered or not
            r'br', r'hr',                           # new-line,
            r'code', r'pre', r'pre\s+class=.*',     # code inline or pre-formatted
            r'table', r'th', r'tr', r'td',          # tables
            r'sup', r'sub',                         # up and down text
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

        return dominate.util.raw(data)


class Stats:
    __slots__ = ['lecture', 'remediation', 'tutorial', 'practical', 'personnal', 'exam', '__current', '__list']

    def __init__(self):
        self.lecture: float = 0.0
        self.remediation: float = 0.0
        self.tutorial: float = 0.0
        self.practical: float = 0.0
        self.personnal: float = 0.0
        self.exam: float = 0.0

    @property
    def total(self) -> float:
        return self.lecture + self.remediation + self.tutorial + self.practical + self.personnal + self.exam

    @property
    def supervised(self) -> float:
        return self.lecture + self.remediation + self.tutorial + self.practical + self.exam

    def __iter__(self):
        self.__current = 0
        self.__list = ['lecture', 'remediation', 'tutorial', 'practical', 'personnal', 'exam', 'total', 'supervised']
        return self

    def __next__(self):
        if self.__current >= len(self.__list):
            raise StopIteration
        self.__current += 1
        return self.__list[self.__current-1]

    def __iadd__(self, other: Stats) -> Stats:
        self.lecture += other.lecture
        self.remediation += other.remediation
        self.tutorial += other.tutorial
        self.practical += other.practical
        self.personnal += other.personnal
        self.exam += other.exam
        return self

    @staticmethod
    def format(hours: float) -> str:
        hour = int(hours)
        mn = math.ceil((int((hours - hour) * 100000) * 60) / 100000)
        return f'{hour} h {mn:02}'

    def __getitem__(self, key) -> float:
        match key:
            case 'lecture': return self.lecture
            case 'remediation': return self.remediation
            case 'tutorial': return self.tutorial
            case 'practical': return self.practical
            case 'personnal': return self.personnal
            case 'exam': return self.exam
            case 'total': return self.total
            case 'supervised': return self.supervised
        raise KeyError(key)

    def __str__(self):
        return f'l:{self.lecture} / r:{self.remediation} / t:{self.tutorial} / p:{self.practical} /h: {self.personnal} / e:{self.exam} / [{self.total} / {self.supervised}]'

    def update(self, kind: str, value: float) -> Stats:
        match kind:
            case 'lecture':
                self.lecture += value
            case 'remediation':
                self.remediation += value
            case 'tutorial':
                self.tutorial += value
            case 'practical':
                self.practical += value
            case 'personnal':
                self.personnal += value
            case 'exam':
                self.exam += value
        return self


class Recap:
    def display(self, cycle: Cycle):
        def build_row(_semester: str, _ue: str, _ecue: ECUE):
            result = [_semester, Tools.tr(_ue.split('-')[-1]), _ecue.label]
            for k in _ecue.stats:
                result.append(_ecue.stats[k])
            return result

        grid = []
        for semester in sorted(cycle.semesters):
            if 0 != len(grid):
                grid.append(['SKIP', '', '', 0, 0, 0, 0, 0, 0, 0, 0])
            for ue in sorted(cycle.semesters[semester].ues):
                for ecue in sorted(cycle.semesters[semester].ues[ue].ecues):
                    if type(cycle.semesters[semester].ues[ue].ecues[ecue]) == list:
                        for secue in sorted(cycle.semesters[semester].ues[ue].ecues[ecue], key=lambda x: x.code):
                            grid.append(build_row(semester, ue, secue))
                    else:
                        grid.append(build_row(semester, ue, cycle.semesters[semester].ues[ue].ecues[ecue]))
                line = [semester, Tools.tr(ue.split('-')[-1]), 'Total UE']
                line.extend([cycle.semesters[semester].ues[ue].stats[k] for k in cycle.semesters[semester].ues[ue].stats])
                grid.append(line)
            line = [semester, 'Total Semestre', 'Total Semestre']
            line.extend([cycle.semesters[semester].stats[k] for k in cycle.semesters[semester].stats])
            grid.append(line)

        rows, cols = len(grid), len(grid[0])
        merged = [[False] * cols for _ in range(rows)]
        with dt.div(cls='tab-pane fade', id=f'div-recap', role='tabpanel', aria_labelledby=f'tab-recap'):
            with dt.div(cls='overflow-auto', style="height: 80vh; overflow-y: scroll;"):
                with dt.table(cls='table table-bordered table-sm', style='vertical-align: middle; '):
                    with dt.thead():
                        with dt.tr(cls='table-secondary fw-bold sticky-top'):
                            dt.td(du.raw(Tools.tr('semester')))
                            dt.td(du.raw(Tools.tr('ue')))
                            dt.td(du.raw(Tools.tr('ecue')))

                            for cat in cycle.stats:
                                dt.td(du.raw(Tools.tr(cat)), style='text-align: right;')

                    with dt.tbody():
                        for idx, line in enumerate(grid):
                            with dt.tr():
                                if 'SKIP' == line[0]:
                                    dt.td(colspan='11', style='border-left: none; border-right: none; background-color: #00000000;')
                                    continue
                                cstyle = None
                                for idy, item in enumerate(line):
                                    if 1 == idy and item.startswith('Total') and cstyle is None:
                                        cstyle = 'background-color: #B70D7F33; font-weight: bold; '
                                    if 2 == idy and item.startswith('Total') and cstyle is None:
                                        cstyle = 'background-color: #B70D7F11; font-style: italic; '
                                    if idy > 2:
                                        if cstyle is None:
                                            cstyle = "background-color: #F0FDFD; " if idx % 2 == 0 else "background-color: #FFFFFF; "
                                        dt.td(item if item > 0 else '', style=f'text-align: right; {cstyle};')
                                    elif not merged[idx][idy]:
                                        value, rowspan, colspan = grid[idx][idy], 1, 1
                                        while idx + rowspan < rows and grid[idx + rowspan][idy] == value:
                                            rowspan += 1
                                        while idy + colspan < cols and grid[idx][idy + colspan] == value:
                                            colspan += 1
                                        for mr in range(rowspan):
                                            for mc in range(colspan):
                                                merged[idx + mr][idy + mc] = True
                                        dt.td(du.raw(item), colspan=(f'{colspan}' if colspan > 1 else ''), rowspan=(f'{rowspan}' if rowspan > 1 else ''), style=('' if idy < 1 else f'{cstyle if cstyle is not None else ""};'), cls='table-secondary' if idy < 1 else '')

    def display_link(self):
        return dt.a(Tools.tr('global-hours'), id=f'tab-recap', cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed preambule nav-link', data_bs_toggle='tab', data_bs_target=f'#div-recap', aria_selected='true', aria_controls=f'div-recap', role='tab', type='button')


class Cycle:
    __slots__ = ['preamble', 'code', 'stats', 'semesters', 'recap']

    def __init__(self, code: str):
        self.code: str = code
        self.preamble: Preamble | None = None
        self.stats: Stats = Stats()
        self.semesters: dict[str, Semester] = {}
        self.recap: Recap = Recap()

    def add_semester(self, value: Semester) -> Cycle:
        self.semesters[value.code] = value
        self.stats += value.stats
        return self

    def display(self, year: str = '23'):
        ctitle = f'{Tools.tr("title")} - {Tools.tr(self.code)}'

        ressources = Tools.load_ressources()
        result = dominate.document(title=ctitle)
        result['lang'] = Tools.tr('lang')
        with result.head:
            dt.meta(http_equiv='Content-Type', content='text/html; charset=utf-8')
            dt.meta(name='language', content=Tools.tr('lang'))
            dt.meta(name='title', content=ctitle)
            for css in ressources['css']:
                dt.style(du.raw(css))
            for js in ressources['js']:
                dt.script(du.raw(js))
            dt.script(du.raw('document.addEventListener("DOMContentLoaded", function() {renderMathInElement(document.body, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}, {left: "\\\\(", right: "\\\\)", display: false}, {left: "\\\\[", right: "\\\\]", display: true}], throwOnError : false }); });'))

        result.body['class'] = 'bg-light'
        with result.body:
            with dt.div(cls='container'):
                with dt.div(cls='row'):
                    with dt.div(cls='col-12'):
                        with open('www/img/logo/epita.svg') as f:
                            logo = f.read()
                        w = re.search('width="([^\"]*)"', logo).group(1)
                        h = re.search('height="([^\"]*)"', logo).group(1)
                        logo = re.sub('width="[^\"]*"', f'viewBox="0 0 {w} {h}"', logo)
                        logo = re.sub('height="[^\"]*"', '', logo)

                        with open('www/img/symbol/download.svg') as f:
                            dl = f.read()

                        dt.h2([
                            dt.div(du.raw(logo), style='width: 64px; height: 42px;'),
                            dt.div(style="width: 32px"),
                            dt.a(dt.div(du.raw(dl), style='width: 42px; height: 42px;'), href='#', download=f'Syllabus {Tools.tr(self.code)}.html', id='syllabus-download'),
                            dt.div(style="width: 16px"),
                            dt.span([ctitle, ' ', dt.code(f'(v{datetime.now().strftime("%Y-%m-%d %H:%M:%S")})')], style='color: #102b65; font-size: 1.25em')
                        ], style='display: flex; vertical-align: middle;')
                        dt.script("""
                            document.getElementById('syllabus-download').addEventListener('click', function() {
                                var htmlContent = document.documentElement.outerHTML;
                                var blob = new Blob([htmlContent], { type: 'text/html' });
                                var url = URL.createObjectURL(blob);
                                this.href = url;
                            });
                        """)
                dt.br()
                with dt.div(cls='row'):
                    with dt.div(cls='col-3'):
                        with dt.div(cls="sticky-top overflow-auto d-flex mx-auto", style="height: 90vh; overflow-y: scroll;"):
                            with dt.ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1', role='tablist'):
                                with dt.li(cls='mb-1 nav-item', role='presentation'):
                                    self.preamble.display_link()

                                for semester in sorted(self.semesters):
                                    self.semesters[semester].display_links()

                                with dt.li(cls='mb-1 nav-item', role='presentation'):
                                    self.recap.display_link()

                    with dt.div(cls='col-9'):
                        with dt.div(cls='tab-content', style='padding-right: 32px'):
                            self.preamble.display(self)
                            for semester in sorted(self.semesters):
                                self.semesters[semester].display()
                            self.recap.display(self)

        os.makedirs(f'public/fr/{year}/{self.code.lower()}', exist_ok=True)
        with open(f'public/fr/{year}/{self.code.lower()}/index.html', 'w') as f:
            f.write(str(result))


class Preamble:
    __slots__ = ['description', 'filepath', 'code']

    def __init__(self, description: str):
        self.description: str = description

    @staticmethod
    def load(filepath: str) -> Preamble:
        print(f'loading Preamble: {filepath}')
        data = Tools.load_yaml(filepath)
        result = Preamble(description=data['description'])
        result.filepath = filepath
        result.code = '-'.join(filepath.split('/')[1:2])
        return result

    def display(self, cycle: Cycle):
        with dt.div(cls='card container tab-pane fade show active', id=f'div-{self.code}-preamble', role='tabpanel', aria_labelledby=f'tab-{self.code}-preamble'):
            with dt.div(cls='row'):
                with dt.div(cls='col-12',  style='padding: 0'):
                    dt.div(Tools.tr('preamble-header'), cls='card-header h3')
            dt.br()
            with dt.div(cls='row overflow-auto', style="height: 80vh; overflow-y: scroll;"):
                with dt.div(cls='col-8', style='padding: 32px;'):
                    dt.div(du.raw(mistune.html(self.description)))
                with dt.div(cls='col-4', style='padding-right: 32px'):
                    with dt.div(cls='sticky-top'):

                        for semester in sorted(cycle.semesters):
                            with dt.table(cls='table table-bordered', style='vertical-align: middle;'):
                                with dt.tbody():
                                    with dt.tr(cls='table-light fw-bold'):
                                        dt.td([Tools.tr('ects'), ' - ', dt.code(cycle.semesters[semester].code)], colspan='2')
                                    for ue in sorted(cycle.semesters[semester].ues):
                                        with dt.tr():
                                            dt.td([cycle.semesters[semester].ues[ue].label, dt.code(f'[{cycle.semesters[semester].ues[ue].code}]')])
                                            dt.td(dt.code(cycle.semesters[semester].ues[ue].ects))

    def display_link(self):
        return dt.a(Tools.tr('preamble'), id=f'tab-{self.code}-preamble', cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed preambule nav-link active', data_bs_toggle='tab', data_bs_target=f'#div-{self.code}-preamble', aria_selected='true', aria_controls=f'div-{self.code}-preamble', role='tab', type='button')


class Semester:
    __slots__ = ['code', 'stats', 'ues']

    def __init__(self, code: str):
        self.code: str = code
        self.stats: Stats = Stats()
        self.ues: dict[str, UE] = {}

    def add_ue(self, value: UE) -> Semester:
        self.ues[value.code] = value
        self.stats += value.stats
        value.semester = self.code
        return self

    def __getitem__(self, item: str):
        return self.ues[item]

    def display(self):
        for ue in self.ues:
            self.ues[ue].display()

    def display_links(self):
        with dt.li(cls='mb-1 ms-3'):
            dt.button(du.raw(Tools.tr(self.code) + f'<sup><b><code>[{self.code}]</code></b></sup>'), cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed', data_bs_toggle='collapse', data_bs_target=f'#nav-sem-{self.code}', aria_expanded='false')
            with dt.div(cls='collapse', id=f'nav-sem-{self.code}').add(dt.ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1')):
                for ue in sorted(self.ues):
                    with dt.li(cls='mb-1 ms-3'):
                        dt.button(Tools.tr(ue.split('-')[-1]), cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed', data_bs_toggle='collapse', data_bs_target=f'#nav-ue-{self.ues[ue].code}', aria_expanded='false')
                        with dt.div(cls='collapse', id=f'nav-ue-{self.ues[ue].code}').add(dt.ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1')):
                            self.ues[ue].display_links()


class UE:
    __slots__ = ['code', 'label', 'level', 'ects', 'coordinator', 'description', 'stats', 'ecues', 'filepath', 'semester']

    def __init__(self, code: str, label: str, level: str, ects: int, coordinator: str):
        self.code: str = code
        self.label: str = label
        self.level: str = level
        self.ects: int = ects
        self.coordinator: str = coordinator
        self.stats: Stats = Stats()
        self.description: str | None = None
        self.ecues: dict[str, ECUE | list[ECUE]] = {}
        self.semester: str | None = None

    def add_ecue(self, value: ECUE) -> UE:
        splits = value.code.split('-')
        if 5 == len(splits):
            if splits[2] not in self.ecues:
                self.ecues[splits[2]] = []
            self.ecues[splits[2]].append(value)
        else:
            self.ecues[value.code] = value
        self.stats += value.stats
        value.ue_code = self.code
        value.ue_label = self.label
        return self

    @staticmethod
    def load(filepath: str) -> UE:
        print(f'loading UE: {filepath}')
        data = Tools.load_yaml(filepath, 'ue.json')
        result = UE(
            code=Tools.get_code(filepath),
            label=data['information']['label'],
            level=data['information']['level'],
            ects=data['information']['ects'],
            coordinator=data['information']['coordinator']
        )
        result.stats = Stats()
        result.filepath = filepath
        if 'description' in data:
            result.description = data['description']
        return result

    def display(self):
        with dt.div(cls='card container tab-pane fade', id=f'div-{self.code}', role='tabpanel', aria_labelledby=f'tab-{self.code}'):
            with dt.div(cls='row'):
                with dt.div(cls='col-12',  style='padding: 0'):
                    dt.div([self.label, ' [', dt.code(self.code), ']'], cls='card-header h3')
            dt.br()
            with dt.div(cls='row overflow-auto', style="height: 80vh; overflow-y: scroll;"):
                with dt.div(cls='col-8', style='padding: 32px;'):
                    dt.div(du.raw(mistune.html(self.description)))

                with dt.div(cls='col-4', style='padding-right: 32px'):
                    with dt.div(cls='sticky-top'):
                        with dt.table(cls='table table-bordered', style='vertical-align: middle;'):
                            with dt.tbody():
                                with dt.tr(cls='table-light fw-bold'):
                                    dt.td(Tools.tr('info'), colspan='2')
                                with dt.tr():
                                    dt.td(Tools.tr('level'), cls='fw-bold')
                                    dt.td(dt.code(self.level))
                                with dt.tr():
                                    dt.td(Tools.tr('semester'), cls='fw-bold')
                                    dt.td(dt.code(self.semester))
                                with dt.tr():
                                    dt.td(Tools.tr('ects'), cls='fw-bold')
                                    dt.td(dt.code(self.ects))
                                with dt.tr():
                                    dt.td(Tools.tr('coordinator'), cls='fw-bold')
                                    dt.td(dt.code(self.coordinator))

                        with dt.table(cls='table table-bordered', style='vertical-align: middle;'):
                            with dt.tbody():
                                with dt.tr(cls='table-light fw-bold'):
                                    dt.td(Tools.tr('ecue-coefficient'), colspan='2')
                                for ecue in sorted(self.ecues):
                                    if type(self.ecues[ecue]) == list:
                                        for secue in self.ecues[ecue]:
                                            with dt.tr():
                                                dt.td([secue.label, dt.code(f'[{secue.code}]')])
                                                dt.td(dt.code(secue.coefficient))
                                    else:
                                        with dt.tr():
                                            dt.td([self.ecues[ecue].label, dt.code(f'[{self.ecues[ecue].code}]')])
                                            dt.td(dt.code(self.ecues[ecue].coefficient))

                        with dt.table(cls='table table-bordered'):
                            with dt.tbody():
                                with dt.tr(cls='table-light fw-bold'):
                                    dt.td(Tools.tr('info-hours'), colspan='2')
                                    for cat in self.stats:
                                        if self.stats[cat] > 0:
                                            with dt.tr():
                                                dt.td(Tools.plain(Tools.tr(cat)))
                                                dt.td(dt.code({Stats.format(self.stats[cat])}), style='text-align: right;')

        for ecue in self.ecues:
            if type(self.ecues[ecue]) == list:
                for secue in self.ecues[ecue]:
                    secue.display()
            else:
                self.ecues[ecue].display()

    def display_links(self):
        with dt.li(cls='mb-1 ms-2 nav-item', role='presentation'):
            dt.a(du.raw(Tools.tr(self.code.split('-')[-1]) + ' <sup><b><code>[UE]</code></b></sup>'), id=f'tab-{self.code}', cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed preambule nav-link', data_bs_toggle='tab', data_bs_target=f'#div-{self.code}', aria_selected='false', aria_controls=f'div-{self.code}', role='tab', type='button')

        for ecue in self.ecues:
            if type(self.ecues[ecue]) == list:
                with dt.li(cls='mb-1 ms-2'):
                    dt.button(Tools.tr(ecue), cls='btn btn-toggle d-inline-flex align-items-center rounded border-0 collapsed text-start', data_bs_toggle='collapse', data_bs_target=f'#nav-sub-{self.code}-{ecue}', aria_expanded="false")
                    with dt.div(cls='collapse', id=f'nav-sub-{self.code}-{ecue}').add(dt.ul(cls='btn-toggle-nav list-unstyled fw-normal pb-1')):
                        for secue in self.ecues[ecue]:
                            with dt.li(cls='mb-1 ms-2 nav-item', role='presentation'):
                                secue.display_link()
            else:
                with dt.li(cls='mb-1 ms-2 nav-item', role='presentation'):
                    self.ecues[ecue].display_link()


class ECUE:
    __slots__ = ['code', 'label', 'coefficient', 'threshold', 'referents', 'prerequisites', 'summary', 'outline', 'tlo', 'activities', 'evaluations', 'stats', 'references', 'others', 'filepath', 'ue_code', 'ue_label']

    def __init__(self, code: str, label: str, coefficient: float, threshold: float, referents: list[str]):
        self.code: str = code
        self.label: str = label
        self.coefficient: float = coefficient
        self.threshold: float = threshold
        self.referents: list[str] = referents
        self.prerequisites: list[str] | None = None
        self.summary: str | None = None
        self.outline: str | None = None
        self.tlo: str | None = None
        self.activities: list[Activity] = []
        self.evaluations: list[Evaluation] = []
        self.others: str | None = None
        self.stats: Stats = Stats()
        self.filepath: str | None = None
        self.references: list[Reference] = []

        self.ue_code = None
        self.ue_label = None

    def add_activity(self, activity: Activity) -> ECUE:
        self.activities.append(activity)
        self.stats.update(activity.kind, activity.hours)
        return self

    def add_evaluation(self, evaluation: Evaluation) -> ECUE:
        self.evaluations.append(evaluation)
        self.stats.update('exam', evaluation.hours)
        return self

    @staticmethod
    def load(filepath: str) -> ECUE:
        print(f'loading ECUE: {filepath}')
        data = Tools.load_yaml(filepath, schema='ecue.json')
        result = ECUE(
            code=Tools.get_code(filepath),
            label=data['information']['label'],
            coefficient=data['information']['coefficient'],
            threshold=data['information']['threshold'],
            referents=data['information']['referents']
        )
        result.filepath = filepath
        if 'prerequisites' in data:
            result.prerequisites = data['prerequisites']
        if 'summary' in data:
            result.summary = data['summary']
        if 'outline' in data:
            result.outline = data['outline']
        if 'tlo' in data:
            result.tlo = data['tlo']
        if 'others' in data:
            result.others = data['others']
        if 'activities' in data:
            for activity in data['activities']:
                result.add_activity(Activity(
                    kind=activity['kind'],
                    hours=activity['hours'],
                    label=activity['label'] if 'label' in activity else None
                ))
        if 'evaluations' in data:
            for evaluation in data['evaluations']:
                result.add_evaluation(Evaluation(
                    kind=evaluation['kind'],
                    environment=evaluation['environment'],
                    hours=evaluation['hours'],
                    code=evaluation['code'],
                    coefficient=evaluation['coefficient'],
                    label=evaluation['label'] if 'label' in evaluation else None,
                    comments=evaluation['comments'] if 'comments' in evaluation else None
                ))
        if 'references' in data:
            for item in data['references']:
                result.references.append(Reference(
                    kind=item['kind'] if 'kind' in item else None,
                    url=item['url'] if 'url' in item else None,
                    isbn13=item['isbn-13'] if 'isbn-13' in item else None,
                    label=item['label'] if 'label' in item else None
                ))
        return result

    def display_link(self):
        return dt.a(du.raw(self.label + ' <sup><b><code>[ECUE]</code></b></sup>'), cls='nav-link link-body-emphasis text-decoration-none rounded ecue d-block', type='button', role='tab', id=f'tab-ecue-{self.code}', data_bs_target=f'#div-ecue-{self.code}', data_bs_toggle='tab', aria_selected='false', aria_controls=f'div-ecue-{self.code}')

    def display(self):
        print(f'generating ECUE: {self.ue_code} / {self.code}')
        result = dt.div(cls='card container tab-pane fade', id=f'div-ecue-{self.code}', role='tabpanel', aria_labelledby=f'tab-ecue-{self.code}')
        with result:
            with dt.div(cls='row'):
                with dt.div(cls='col-12', style='padding: 0'):
                    dt.div([self.label, dt.code(f'[{self.code}]')], cls='card-header h3')
            dt.br()
            with dt.div(cls='row overflow-auto', style="height: 80vh; overflow-y: scroll;"):
                with dt.div(cls='col-8', style='padding: 32px;'):
                    if self.prerequisites is not None:
                        dt.div(Tools.tr('prerequisites'), cls='card-title h4')
                        with dt.div(cls='card-text'):
                            with dt.ul():
                                for item in self.prerequisites:
                                    dt.li(Tools.plain(item))
                        Tools.separate()
                    if self.summary is not None:
                        dt.div(Tools.tr('summary'), cls='card-title h4')
                        dt.div(Tools.plain(self.summary), cls='card-text')
                        Tools.separate()
                    if self.outline is not None:
                        dt.div(Tools.tr('outline'), cls='card-title h4')
                        dt.div(Tools.plain(self.outline), cls='card-text')
                        Tools.separate()
                    if self.tlo is not None:
                        dt.div(Tools.tr('tlo'), cls='card-title h4')
                        with dt.div(cls='card-text'):
                            dt.p(Tools.plain(Tools.tr('tlo-intro')))
                            dt.div(Tools.plain(self.tlo), cls='card-text')
                        Tools.separate()
                    if 0 != len(self.activities):
                        dt.div(Tools.tr('activities'), cls='card-title h4')
                        with dt.div(cls='card-text'):
                            with dt.ul():
                                for item in self.activities:
                                    if item.label is not None:
                                        dt.li(Tools.plain(item.label))
                        Tools.separate()
                    if 0 != len(self.evaluations):
                        dt.div(Tools.tr('evaluations'), cls='card-title h4')
                        with dt.table(cls='table table-bordered'):
                            with dt.thead(cls='table-light'):
                                dt.tr([
                                    dt.td(Tools.tr('evaluations-label')),
                                    dt.td(Tools.tr('evaluations-kind')),
                                    dt.td(Tools.tr('evaluations-environment')),
                                    dt.td(Tools.tr('evaluations-code')),
                                    dt.td(Tools.tr('evaluations-comments'))
                                ])
                            with dt.tbody():
                                for item in self.evaluations:
                                    dt.tr([
                                        dt.td(item.label),
                                        dt.td(Tools.tr(item.kind)),
                                        dt.td(Tools.tr(item.environment)),
                                        dt.td(dt.code(f'[{item.code}]')),
                                        dt.td(Tools.plain(item.comments) if item.comments is not None else '')
                                    ])
                        dt.br()
                        dt.div(Tools.tr('grading'), cls='card-title h4')
                        grade = [dt.code(f'[{Tools.tr("grading-grade")}]'), ' = ']
                        for idx, item in enumerate(self.evaluations):
                            if 0 != idx:
                                grade.append(' + ')
                            grade.append(f'{item.coefficient:.0%}')
                            grade.append(dt.code(f'[{item.code}]'))
                        dt.div(grade, cls='card-text')
                        Tools.separate()

                    if 0 != len(self.references):
                        dt.div(Tools.tr('references'), cls='card-title h4')
                        with dt.div(cls='card-text'):
                            with dt.ul():
                                for item in self.references:
                                    match item.kind:
                                        case 'link':
                                            dt.li(dt.a(item.label, href=item.url, target='_blank'))
                                        case 'book':
                                            dt.li([item.label, ' (', dt.a(item.isbn13, href=f'https://www.google.com/search?q={item.isbn13}', target='_blank'), ' )'])
                                        case 'other':
                                            dt.li(item.label)
                        Tools.separate()

                    if self.others is not None:
                        dt.div(Tools.tr('others'), cls='card-title h4')
                        dt.div(Tools.plain(self.others), cls='card-text')

                with dt.div(cls='col-4', style='padding-right: 32px'):
                    with dt.div(cls='sticky-top'):
                        with dt.table(cls='table table-bordered', style='vertical-align: middle;'):
                            with dt.tbody():
                                with dt.tr(cls='table-light fw-bold'):
                                    dt.td(Tools.tr('info'), colspan='2')
                                with dt.tr():
                                    dt.td('UE', cls='fw-bold')
                                    dt.td([
                                        self.ue_label,
                                        dt.br(),
                                        dt.code(f'[{self.ue_code}]')
                                    ])
                                with dt.tr():
                                    dt.td('ECUE', cls='fw-bold')
                                    dt.td([
                                        self.label,
                                        dt.br(),
                                        dt.code(f'[{self.code}]')
                                    ])
                                with dt.tr():
                                    dt.td(Tools.tr('info-coefficient'), cls='fw-bold')
                                    dt.td(dt.code(self.coefficient))
                                with dt.tr():
                                    dt.td(Tools.tr('info-threshold'), cls='fw-bold')
                                    dt.td(dt.code(self.threshold))
                        with dt.table(cls='table table-bordered'):
                            with dt.tbody():
                                with dt.tr(cls='table-light fw-bold'):
                                    dt.td(Tools.tr('referent') + ('' if 1 == len(self.referents) else 's'), colspan='2')
                                with dt.tr():
                                    with dt.td():
                                        with dt.ul():
                                            for item in self.referents:
                                                dt.li(item)
                        with dt.table(cls='table table-bordered'):
                            with dt.tbody():
                                with dt.tr(cls='table-light fw-bold'):
                                    dt.td(Tools.tr('info-hours'), colspan='2')
                                    for cat in self.stats:
                                        if self.stats[cat] > 0:
                                            with dt.tr(cls=('table-light' if cat in ['total', 'supervised'] else '') + (' fw-bold' if cat in ['total'] else '')):
                                                dt.td(Tools.plain(Tools.tr(cat)))
                                                dt.td(dt.code({Stats.format(self.stats[cat])}), style='text-align: right;')
                        dt.br()
                        dt.br()

        return result


class Activity:
    __slots__ = ['kind', 'hours', 'label']

    def __init__(self, kind: str, hours: float, label: str | None = None):
        self.kind: str = kind
        self.hours: float = hours
        self.label: str | None = label


class Evaluation:
    __slots__ = ['kind', 'environment', 'hours', 'code', 'coefficient', 'label', 'comments']

    def __init__(self, kind: str, environment: str, hours: float, code: str, coefficient: float, label: str | None = None, comments: str | None = None):
        self.kind: str = kind
        self.environment: str = environment
        self.hours: float = hours
        self.code: str = code
        self.coefficient: float = coefficient
        self.label: str | None = label
        self.comments: str | None = comments


class Reference:
    __slots__ = ['kind', 'url', 'isbn13', 'label']

    def __init__(self, kind: str | None = None, url: str | None = None, isbn13: str | None = None, label: str | None = None):
        self.kind = kind
        self.url = url
        self.isbn13 = isbn13
        self.label = label


def main():
    Tools.load_mapping('templates/mapping.yml')

    syllabus = {}
    files = subprocess.run(['find', '-L', f'src', '-name', '[^.]*.yml'], stdout=subprocess.PIPE).stdout.decode('utf-8').splitlines()
    for file in files:
        Tools.store(syllabus, ECUE.load(file), file)

    files = subprocess.run(['find', '-L', f'src', '-name', '*.ue.yml'], stdout=subprocess.PIPE).stdout.decode('utf-8').splitlines()
    for file in files:
        Tools.store(syllabus, UE.load(file), file)

    files = subprocess.run(['find', '-L', f'src', '-name', '*.preamble.yml'], stdout=subprocess.PIPE).stdout.decode('utf-8').splitlines()
    for file in files:
        Tools.store(syllabus, Preamble.load(file), file)

    years = {}
    for year in sorted(syllabus):
        for cycle in sorted(syllabus[year]):
            _cycle = Cycle(code=cycle)  # type: Cycle
            for semester in sorted(syllabus[year][cycle]):
                _semester = Semester(code=semester)
                if type(syllabus[year][cycle][semester]) == dict:
                    for ue in sorted(syllabus[year][cycle][semester]):
                        _ue = syllabus[year][cycle][semester][ue]['preamble']  # type: UE
                        for ecue in sorted(syllabus[year][cycle][semester][ue]):
                            if 'preamble' == ecue:
                                continue
                            _ue.add_ecue(syllabus[year][cycle][semester][ue][ecue])
                        _semester.add_ue(_ue)
                    _cycle.add_semester(_semester)
                else:
                    _cycle.preamble = syllabus[year][cycle][semester]
            if year not in years:
                years[year] = []
            years[year].append(_cycle)

    for year in years:
        for cycle in years[year]:
            cycle.display()


if __name__ == '__main__':
    main()
