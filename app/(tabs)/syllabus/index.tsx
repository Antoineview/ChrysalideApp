import { Papicons } from '@getpapillon/papicons';
import { LegendList } from '@legendapp/list';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAurigaRefresh } from '@/components/AurigaRefreshProvider';
import AurigaAPI from '@/services/auriga';
import { Syllabus } from '@/services/auriga/types';
import ChipButton from '@/ui/components/ChipButton';
import Item, { Leading, Trailing } from '@/ui/components/Item';
import List from '@/ui/components/List';
import Stack from '@/ui/components/Stack';
import TabHeader from '@/ui/components/TabHeader';
import TabHeaderTitle from '@/ui/components/TabHeaderTitle';
import Typography from '@/ui/components/Typography';
import adjust from '@/utils/adjustColor';
import { getSubjectColor } from '@/utils/subjects/colors';
import { getSubjectEmoji } from '@/utils/subjects/emoji';
import { getSubjectName } from '@/utils/subjects/name';

function cleanHtml(raw?: string | null): string {
  if (!raw) { return ""; }
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

const SyllabusView: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomTabBarHeight = useBottomTabBarHeight();

  const [headerHeight, setHeaderHeight] = useState(0);
  const [syllabusList, setSyllabusList] = useState<Syllabus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parcours, setParcours] = useState<'all' | 'PC' | 'PA'>('all');

  // Parcours options
  const parcoursOptions = [
    { label: 'Tous', value: 'all', icon: { ios: 'list.bullet', papicon: 'list' } },
    { label: 'Parcours Classique', value: 'PC', icon: { ios: 'person', papicon: 'user' } },
    { label: 'Parcours Accompagné', value: 'PA', icon: { ios: 'person.2', papicon: 'users' } },
  ];

  // Detect if any syllabus has PC/PA parcours codes
  // Only show the toggle if at least one syllabus has _PC_ or _PA_ pattern
  const hasParcours = useMemo(() => {
    return syllabusList.some(s =>
      s.name.includes('_PC_') || s.name.endsWith('_PC') ||
      s.name.includes('_PA_') || s.name.endsWith('_PA')
    );
  }, [syllabusList]);

  // Load syllabus data
  // Load syllabus data
  useFocusEffect(
    useCallback(() => {
      loadSyllabus();
    }, [])
  );

  const loadSyllabus = async () => {
    setLoading(true);
    try {
      const data = AurigaAPI.getAllSyllabus();
      setSyllabusList(data);
    } catch (e) {
      console.error("Failed to load syllabus:", e);
    } finally {
      setLoading(false);
    }
  };

  const { refreshAuriga } = useAurigaRefresh();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Use global background refresh
    refreshAuriga();
    setIsRefreshing(false);
  };

  // Filter by parcours and group by semester
  const groupedSyllabus = useMemo(() => {
    // First filter by parcours
    // Parcours codes (PC/PA) appear as standalone segments with underscores: _PC_ or _PA_
    const filtered = syllabusList.filter((s) => {
      if (parcours === 'all') { return true; }

      // Check for parcours pattern with underscores to avoid false matches
      // e.g., "_PA_" should match but "AFP" (containing PA) should not
      const hasPC = s.name.includes('_PC_') || s.name.endsWith('_PC');
      const hasPA = s.name.includes('_PA_') || s.name.endsWith('_PA');

      if (parcours === 'PC') {
        // Show items with PC or items without any parcours (for S05+ which have no PC/PA)
        return hasPC || (!hasPC && !hasPA);
      }

      if (parcours === 'PA') {
        // Show items with PA or items without any parcours (for S05+ which have no PC/PA)
        return hasPA || (!hasPC && !hasPA);
      }

      return true;
    });

    // Then group by semester
    const groups: { [key: number]: Syllabus[] } = {};
    filtered.forEach((s) => {
      if (!groups[s.semester]) {
        groups[s.semester] = [];
      }
      groups[s.semester].push(s);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([semester, items]) => {
        // Group by UE
        const ueGroups: { [key: string]: Syllabus[] } = {};
        items.forEach((item) => {
          const ueName = item.UE || "Autre";
          if (!ueGroups[ueName]) {
            ueGroups[ueName] = [];
          }
          ueGroups[ueName].push(item);
        });

        const sortedUeGroups = Object.entries(ueGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, groupItems]) => ({
            name,
            items: groupItems.sort((a, b) => a.name.localeCompare(b.name)),
          }));

        return {
          semester: Number(semester),
          ueGroups: sortedUeGroups,
        };
      });
  }, [syllabusList, parcours]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Chrysalide Logo SVG (Monochrome icon tinted with primary color)
  const coverLogo = `<svg width="80" height="80" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M601.47 226.215L589.382 294.921H800.112L671.513 539.869L903.36 760.436H507.492L482.569 902.106L416.03 890.401L438.894 760.436H120.641L351.487 540.355L214.693 294.921H520.784L534.93 214.511L601.47 226.215ZM519.377 692.874H734.322L587.975 553.646L688.335 362.483H577.497L519.377 692.874ZM435.971 553.16L289.421 692.874H450.779L508.899 362.483H329.697L435.971 553.16ZM681.344 162.121L652.762 223.341L587.612 192.922L616.192 131.705L681.344 162.121ZM557.365 188.027L486.983 202.733L473.165 136.601L543.547 121.894L557.365 188.027Z" fill="${colors.primary}"/>
  </svg>`;

  const generateFullPdfHtml = (semesters: typeof groupedSyllabus) => {
    const title = "SYLLABUS";
    const currentYear = new Date().getFullYear();
    const startYear = new Date().getMonth() < 8 ? currentYear - 1 : currentYear;
    const year = `${startYear} — ${startYear + 1}`;
    const parcoursLabel = parcours === 'all' ? 'Tous Parcours' : (parcours === 'PC' ? 'Parcours Classique' : 'Parcours Accompagné');

    // Helper to calculate stats
    const calculateStats = (activities: any[]) => {
      const stats = { lecture: 0, tutorial: 0, practical: 0, personal: 0, exam: 0, total: 0 };
      if (!activities) { return stats; }

      activities.forEach(a => {
        const h = a.duration ? a.duration / 3600 : 0;
        stats.total += h;
        // Map types to categories if possible
        const type = (a.type || "").toLowerCase();
        if (type.includes('cour') || type.includes('cm')) { stats.lecture += h; }
        else if (type.includes('td')) { stats.tutorial += h; }
        else if (type.includes('tp')) { stats.practical += h; }
        else if (type.includes('perso')) { stats.personal += h; }
        else if (type.includes('exam') || type.includes('ds')) { stats.exam += h; }
        else if (h > 0) { stats.lecture += h; } // Default fallback
      });
      return stats;
    };

    const formatHours = (h: number) => {
      if (h === 0) { return "-"; }
      const hours = Math.floor(h);
      const minutes = Math.round((h - hours) * 60);
      return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : '00'}`;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

          @page { margin: 0; size: A4; }
          body { 
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #1C1C1E; 
            margin: 0; 
            padding: 0;
            background: #F2F2F7;
            font-size: 10px; /* Reduced base font size */
            -webkit-print-color-adjust: exact;
          }
          
          /* Page Structure - Exact A4 dimensions */
          .page {
            width: 210mm;
            height: 297mm; /* Exact A4 height */
            padding: 12mm; /* Balanced padding */
            box-sizing: border-box;
            position: relative;
            page-break-after: always;
            background: #F2F2F7;
            overflow: hidden;
            border-bottom: 1px solid transparent; 
          }
          .page:last-child { page-break-after: avoid; }

          /* Auto Page - For TOC/Recap that might span multiple pages */
          .page-auto {
            width: 210mm;
            min-height: 297mm;
            padding: 12mm;
            box-sizing: border-box;
            position: relative;
            page-break-after: always;
            background: #F2F2F7;
            overflow: visible;
          }
          .page-auto .footer {
             position: relative;
             margin-top: 20px;
             border-top: 1px solid #E5E5EA;
             padding-top: 8px;
             bottom: auto;
             left: auto;
             right: auto;
          }

          /* Modern Card - More compact */
          .card {
            background: white;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            border: 1px solid #E5E5EA;
          }

          /* Headers */
          h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #000; letter-spacing: -0.5px; }
          h2 { font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; color: #000; }
          h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px 0; color: #000; }
          h4 { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #8E8E93; margin: 0 0 6px 0; letter-spacing: 0.5px; }
          
          p, li { line-height: 1.4; color: #3A3A3C; margin-bottom: 6px; }

          /* Cover Page */
          .cover-page {
            background: #FFFFFF;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
          }
          .cover-title { font-size: 36px; font-weight: 800; color: ${colors.primary}; margin-bottom: 8px; letter-spacing: -1px; }
          .cover-subtitle { font-size: 20px; color: #8E8E93; font-weight: 500; }
          .cover-year { 
            font-size: 16px; 
            color: white; 
            background: ${colors.primary}; 
            padding: 6px 14px; 
            border-radius: 16px; 
            margin-top: 24px; 
          }

          /* Course Header - Compact */
          .course-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 0;
            border-bottom: none;
          }
          .course-icon {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            margin-right: 12px;
            color: white;
            flex-shrink: 0;
          }
          .course-title-group { flex: 1; }
          .course-title { font-size: 18px; font-weight: 700; margin: 0; line-height: 1.2; }
          .course-subtitle { font-size: 11px; color: #8E8E93; margin-top: 2px; font-weight: 500; }

          /* Simple Grid */
          .grid { display: flex; gap: 12px; }
          .col { flex: 1; }
          .col-2 { flex: 2; }

          /* Info Box */
          .info-box {
            background: #F2F2F7;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 12px;
          }
          .info-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #E5E5EA; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #8E8E93; }
          .info-value { font-weight: 600; color: #000; text-align: right; }

          /* Activity List */
          .activity-list { list-style: none; padding: 0; margin: 0; }
          .activity-item { 
            background: #F2F2F7; 
            padding: 6px 10px; 
            border-radius: 6px; 
            margin-bottom: 4px; 
            display: flex; 
            justify-content: space-between;
            font-size: 10px;
          }

          /* Tables */
          table { width: 100%; border-collapse: separate; border-spacing: 0; width: 100%; }
          th { text-align: left; padding: 6px; color: #8E8E93; font-weight: 600; font-size: 9px; border-bottom: 1px solid #E5E5EA; }
          td { padding: 6px; border-bottom: 1px solid #E5E5EA; color: #1C1C1E; font-size: 10px; }
          tr:last-child td { border-bottom: none; }
          
          .recap-table th { background: #F2F2F7; position: sticky; top: 0; }
          .recap-ue-row td { background: #F9F9F9; font-weight: 600; font-size: 9px; color: #3A3A3C; }

          /* Footer */
          .footer {
            position: absolute;
            bottom: 12mm; /* Balanced with top padding */
            left: 12mm;
            right: 12mm;
            padding-top: 8px;
            border-top: 1px solid #E5E5EA;
            display: flex;
            justify-content: space-between;
            color: #AEAEB2;
            font-size: 9px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>

        <!-- Cover Page -->
        <div class="page cover-page">
           <div style="margin-bottom: 40px; transform: scale(1.5);">
             ${coverLogo}
           </div>
           <div class="cover-title">SYLLABUS</div>
           <div class="cover-subtitle">${parcoursLabel}</div>
           <div class="cover-year">${year}</div>
        </div>

        <!-- Table of Contents (Split by Semester) -->
        ${semesters.map(sem => `
          <div class="page-auto">
            <div class="card">
               <h1>Sommaire — Semestre ${sem.semester}</h1>
            </div>
            <div class="card" style="min-height: 80%;">
               <div style="margin-top: 15px; margin-bottom: 5px; font-weight: 700; font-size: 13px; color: ${colors.primary};">
                  Semestre ${sem.semester}
               </div>
               ${sem.ueGroups.map(group => `
                  <div style="margin-left: 10px; margin-top: 8px; font-weight: 600; font-size: 11px; color: #3A3A3C;">
                     ${group.name}
                  </div>
                  ${group.items.map(item => `
                      <div style="margin-left: 20px; padding: 4px 0; border-bottom: 1px solid #F2F2F7; display: flex; justify-content: space-between;">
                         <a href="#course-${item.code || item.id}" style="text-decoration: none; color: #007AFF;">${cleanHtml(item.caption?.name || item.name)}</a>
                         <span style="color: #AEAEB2;">${item.code || ''}</span>
                      </div>
                  `).join('')}
               `).join('')}
            </div>
            <div class="footer">
               <span>${parcoursLabel}</span>
               <span>${year}</span>
            </div>
          </div>
        `).join('')}

        <!-- Recap Table (Split by Semester) -->
        ${semesters.map(sem => {
      let rows = '';
      sem.ueGroups.forEach(group => {
        let groupCoef = 0;

        const itemRows = group.items.map(item => {
          const stats = calculateStats(item.activities || []);
          const coef = item.exams?.reduce((acc, e) => acc + (e.weighting || 0), 0) || 0;
          groupCoef += coef;
          const subjColor = getSubjectColor(item.caption?.name || item.name);

          return `
                   <tr>
                      <td style="border:none;"></td>
                      <td>
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${subjColor}; margin-right:6px;"></span>
                        ${cleanHtml(item.caption?.name || item.name)}
                      </td>
                      <td align="right">${stats.lecture > 0 ? formatHours(stats.lecture) : '-'}</td>
                      <td align="right">${(stats.tutorial + stats.practical) > 0 ? formatHours(stats.tutorial + stats.practical) : '-'}</td>
                      <td align="right">${stats.personal > 0 ? formatHours(stats.personal) : '-'}</td>
                      <td align="right"><b>${formatHours(stats.total)}</b></td>
                      <td align="center">${coef > 0 ? coef + '%' : '-'}</td>
                   </tr>
                 `;
        }).join('');

        rows += `
                <tr class="recap-ue-row">
                   <td></td>
                   <td colspan="5" style="text-transform:uppercase; font-size:9px; letter-spacing:0.5px;">${group.name}</td>
                   <td align="center"><b>${groupCoef}%</b></td>
                </tr>
                ${itemRows}
              `;
      });

      return `
            <div class="page" id="recap-${sem.semester}">
               <div class="card">
                 <h1>Découpage — Semestre ${sem.semester}</h1>
               </div>
               
               <div class="card">
                 <table class="recap-table">
                   <thead>
                     <tr>
                       <th>UE</th>
                       <th>ECUE</th>
                       <th style="text-align:right;">Cours</th>
                       <th style="text-align:right;">TD/TP</th>
                       <th style="text-align:right;">Perso</th>
                       <th style="text-align:right;">Total</th>
                       <th style="text-align:center;">Coef</th>
                     </tr>
                   </thead>
                   <tbody>
                      <tr>
                         <td colspan="7" style="background:${colors.primary}15; font-weight:bold; color:${colors.primary}; padding:10px;">Semestre ${sem.semester}</td>
                      </tr>
                      ${rows}
                   </tbody>
                 </table>
               </div>
               <div class="footer">
                 <span>${parcoursLabel}</span>
                 <span>${year}</span>
               </div>
            </div>
           `;
    }).join('')}

        <!-- Course Pages -->
        ${semesters.flatMap(sem => sem.ueGroups.flatMap(group => group.items.map(item => {
      const stats = calculateStats(item.activities || []);
      const coef = item.exams?.reduce((acc, e) => acc + (e.weighting || 0), 0) || 0;
      const sColor = getSubjectColor(item.caption?.name || item.name);
      const sEmoji = getSubjectEmoji(item.caption?.name || item.name);

      return `
             <div class="page" id="course-${item.code || item.id}">
                <div class="card" style="margin-bottom: 20px;">
                   <div class="course-header" style="border-bottom:none; margin-bottom:0; padding-bottom:0;">
                      <div class="course-icon" style="background-color: ${sColor};">
                        ${sEmoji}
                      </div>
                      <div class="course-title-group">
                         <h1 class="course-title" style="color: ${sColor};">${cleanHtml(item.caption?.name || item.name)}</h1>
                         <div class="course-subtitle">${group.name} • ${item.code || 'CODE'}</div>
                      </div>
                      <div style="text-align:right;">
                        <div style="font-size:18px; font-weight:700; color:${sColor};">${coef > 0 ? coef : '-'} %</div>
                        <div style="font-size:10px; color:#8E8E93; text-transform:uppercase;">Coefficient</div>
                      </div>
                   </div>
                </div>

                <div class="grid">
                   <div class="col-2">
                     <!-- Description -->
                     <div class="card">
                        <h4>Description</h4>
                        ${item.caption?.goals?.fr ? `<p>${cleanHtml(item.caption.goals.fr)}</p>` : '<p style="font-style:italic; color:#8E8E93;">Non disponible</p>'}
                     </div>

                     <!-- Acquis -->
                     ${item.caption?.program?.fr ? `
                        <div class="card">
                           <h4>Acquis d'Apprentissage</h4>
                           <p>${cleanHtml(item.caption.program.fr)}</p>
                        </div>
                     ` : ''}

                     <!-- Hours Box -->
                     <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px;">
                           <h4>Volume Horaire</h4>
                           <span style="font-weight:700; font-size:14px;">${formatHours(stats.total)}</span>
                        </div>
                        <div style="display:flex; background:#F2F2F7; border-radius:8px; overflow:hidden;">
                           <div style="flex:1; padding:8px; text-align:center; border-right:1px solid #E5E5EA;">
                              <div style="font-size:10px; color:#8E8E93; margin-bottom:4px;">Face-à-face</div>
                              <div style="font-weight:600;">${formatHours(stats.lecture + stats.tutorial + stats.practical + stats.exam)}</div>
                           </div>
                           <div style="flex:1; padding:8px; text-align:center;">
                              <div style="font-size:10px; color:#8E8E93; margin-bottom:4px;">Travail Perso.</div>
                              <div style="font-weight:600;">${formatHours(stats.personal)}</div>
                           </div>
                        </div>
                        <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                           ${stats.lecture > 0 ? `<span style="background:#E5F1FF; color:#007AFF; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">Cours: ${formatHours(stats.lecture)}</span>` : ''}
                           ${stats.tutorial > 0 ? `<span style="background:#EAF6ED; color:#34C759; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">TD: ${formatHours(stats.tutorial)}</span>` : ''}
                           ${stats.practical > 0 ? `<span style="background:#FFF8E5; color:#FF9500; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">TP: ${formatHours(stats.practical)}</span>` : ''}
                           ${stats.exam > 0 ? `<span style="background:#FFEEEE; color:#FF3B30; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">Exam: ${formatHours(stats.exam)}</span>` : ''}
                        </div>
                     </div>
                   </div>

                   <div class="col">
                      <!-- Referent -->
                      <div class="card">
                         <h4>Référent</h4>
                         ${item.responsables && item.responsables.length > 0 ?
          item.responsables.map(r => `
                             <div style="display:flex; align-items:center; margin-bottom:8px;">
                                <div style="width:24px; height:24px; background:#F2F2F7; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-right:8px; color:#8E8E93; font-size:10px;">
                                  ${r.firstName.charAt(0)}${r.lastName.charAt(0)}
                                </div>
                                <div style="font-weight:500;">${r.firstName} ${r.lastName}</div>
                             </div>
                           `).join('') :
          '<div style="color:#8E8E93; font-style:italic;">Non renseigné</div>'}
                      </div>

                      <!-- Info -->
                      <div class="card">
                         <h4>Informations</h4>
                         <div class="info-row"><span class="info-label">Semestre</span><span class="info-value">S${sem.semester}</span></div>
                         <div class="info-row"><span class="info-label">UE</span><span class="info-value">${group.name}</span></div>
                         <div class="info-row"><span class="info-label">Seuil</span><span class="info-value">${item.minScore !== undefined ? item.minScore : 6}</span></div>
                      </div>

                      <!-- Evals -->
                      ${item.exams && item.exams.length > 0 ? `
                        <div class="card">
                           <h4>Évaluations</h4>
                           <ul class="activity-list">
                              ${item.exams.map(e => `
                                <li class="activity-item">
                                   <span style="font-weight:600;">${e.typeName || e.type || 'Exam'}</span>
                                   <span style="background:${colors.primary}15; color:${colors.primary}; padding:2px 6px; border-radius:4px; font-weight:700;">${e.weighting}%</span>
                                </li>
                              `).join('')}
                           </ul>
                        </div>
                      ` : ''}
                   </div>
                </div>

                <div class="footer">
                  <span>${cleanHtml(item.caption?.name || item.name)}</span>
                  <span>${year}</span>
                  <span>S${sem.semester}</span>
               </div>
             </div>
           `;
    }))).join('')}

      </body>
      </html>
    `;
    return html;
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const html = generateFullPdfHtml(groupedSyllabus);
      const { uri } = await Print.printToFileAsync({
        html,
        width: 595, // A4 width in points (72 dpi)
        height: 842, // A4 height in points (72 dpi)
        margins: { left: 0, right: 0, top: 0, bottom: 0 } // Critical: Remove default OS margins
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Syllabus complet'
        });
      }
    } catch {
      // fail silently
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Memoized syllabus item component to avoid setState during render
  const SyllabusItem = React.memo(({ syllabus, ...props }: { syllabus: Syllabus } & any) => {
    const subjectColor = React.useMemo(
      () => adjust(getSubjectColor(syllabus.caption?.name || syllabus.name), theme.dark ? 0.2 : -0.4),
      [syllabus.caption?.name, syllabus.name, theme.dark]
    );
    // Use caption?.name for lookup since that's what's registered in the store
    const subjectName = React.useMemo(
      () => getSubjectName(syllabus.caption?.name || syllabus.name),
      [syllabus.caption?.name, syllabus.name]
    );

    // Use getSubjectEmoji with caption.name since that's what's registered in the store
    const subjectEmoji = React.useMemo(
      () => getSubjectEmoji(syllabus.caption?.name || syllabus.name),
      [syllabus.caption?.name, syllabus.name]
    );

    const handlePress = useCallback(() => {
      router.push({
        pathname: '/(modals)/syllabus',
        params: { syllabusData: JSON.stringify(syllabus) },
      } as any);
    }, [syllabus, router]);

    return (
      <Item {...props} onPress={handlePress}>
        <Leading>
          <Stack width={36} height={36} card hAlign="center" vAlign="center" radius={32} backgroundColor={subjectColor + "22"}>
            <Text style={{ fontSize: 18 }}>{subjectEmoji}</Text>
          </Stack>
        </Leading>

        <Typography variant="title" numberOfLines={1} color={subjectColor}>
          {subjectName}
        </Typography>
        <Typography variant="caption" color="secondary">
          {syllabus.exams?.length || 0} {t("Syllabus_Exams", { count: syllabus.exams?.length || 0 })}
        </Typography>

        <Trailing>
          {syllabus.grade !== undefined && (
            <View
              style={{
                marginRight: 8,
                backgroundColor: subjectColor + "20",
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Typography
                variant="body2"
                color={subjectColor}
                style={{ fontWeight: "bold" }}
              >
                {typeof syllabus.grade === "number"
                  ? syllabus.grade.toFixed(2).replace(".00", "")
                  : syllabus.grade}
              </Typography>
            </View>
          )}
          <Papicons name="ChevronRight" size={18} color={colors.text + "44"} />
        </Trailing>
      </Item>
    );
  });
  SyllabusItem.displayName = 'Item';

  const renderSemesterSection = ({ item }: { item: { semester: number; ueGroups: { name: string; items: Syllabus[] }[] } }) => (
    <Stack style={{ marginBottom: 16 }}>
      <Typography variant="h6" color="secondary" style={{ marginBottom: 8, marginLeft: 4 }}>
        Semestre {item.semester}
      </Typography>
      <List>
        {item.ueGroups.flatMap((group) => [
          <View key={`header - ${group.name} `} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Typography variant="body2" color="tertiary" style={{ fontSize: 13, textTransform: 'uppercase' }}>
              {group.name}
            </Typography>
          </View>,
          ...group.items.map((syllabus) => (
            <SyllabusItem key={syllabus.id} syllabus={syllabus} />
          )),
        ])}
      </List>
    </Stack>
  );

  return (
    <View style={{ flex: 1 }}>
      <TabHeader
        onHeightChanged={setHeaderHeight}
        title={
          <TabHeaderTitle
            leading={t("Tab_Syllabus")}
            chevron={false}
          />
        }
        trailing={
          // Only show parcours filter if at least one syllabus has PC/PA
          hasParcours ? (
            <ChipButton
              onPressAction={({ nativeEvent }) => {
                const actionId = nativeEvent.event;
                if (actionId.startsWith("parcours:")) {
                  const value = actionId.replace("parcours:", "") as 'all' | 'PC' | 'PA';
                  setParcours(value);
                }
              }}
              actions={
                parcoursOptions.map((p) => ({
                  id: "parcours:" + p.value,
                  title: p.label,
                  state: parcours === p.value ? "on" : "off",
                  image: Platform.select({
                    ios: p.icon.ios,
                  }),
                  imageColor: colors.text,
                }))
              }
              icon={parcoursOptions.find(p => p.value === parcours)?.icon.papicon || 'filter'}
              chevron
            >
              {parcoursOptions.find(p => p.value === parcours)?.label || 'Tous'}
            </ChipButton>
          ) : undefined
        }
      />

      <LegendList
        data={groupedSyllabus}
        renderItem={renderSemesterSection}
        keyExtractor={(item) => `semester - ${item.semester} `}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: bottomTabBarHeight + insets.bottom + 16,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressViewOffset={headerHeight + insets.top}
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <Stack hAlign="center" vAlign="center" padding={[32, 16]}>
              <Typography variant="body1" color="secondary">
                {t("Syllabus_Empty")}
              </Typography>
            </Stack>
          )
        }
        ListFooterComponent={
          !loading && syllabusList.length > 0 ? (
            <View style={{ paddingBottom: bottomTabBarHeight + insets.bottom + 16, paddingTop: 16 }}>
              <TouchableOpacity
                onPress={handleDownloadPdf}
                disabled={isGeneratingPdf}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  marginHorizontal: 16,
                  padding: 16,
                  borderRadius: 12,
                  opacity: isGeneratingPdf ? 0.7 : 1,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                {isGeneratingPdf ?
                  <ActivityIndicator color="white" style={{ marginRight: 8 }} /> :
                  <Papicons name="Download" size={20} color="white" style={{ marginRight: 8 }} />
                }
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {isGeneratingPdf ? 'Génération...' : 'Télécharger le syllabus complet (PDF)'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default SyllabusView;
