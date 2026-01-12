import { Syllabus } from "@/services/auriga/types";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getUeName } from "@/utils/ueParams";

import { cleanHtml, parseDeltaToText } from "./textHelpers";


const sanitizeId = (text: string | number | undefined | null) => {
  if (!text) { return "unknown-id"; }
  return String(text).replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
};

export const generateFullPdfHtml = (
  semesters: {
    semester: number;
    ueGroups: { name: string; items: Syllabus[] }[];
  }[],
  parcours: "all" | "PC" | "PA",
  colors: any
) => {
  const title = "SYLLABUS";
  const currentYear = new Date().getFullYear();
  const startYear = new Date().getMonth() < 8 ? currentYear - 1 : currentYear;
  const year = `${startYear} — ${startYear + 1}`;
  const parcoursLabel =
    parcours === "all"
      ? "Tous Parcours"
      : parcours === "PC"
        ? "Parcours Classique"
        : "Parcours Accompagné";

  // Chrysalide Logo SVG (Monochrome icon tinted with primary color)
  const coverLogo = `<svg width="80" height="80" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M601.47 226.215L589.382 294.921H800.112L671.513 539.869L903.36 760.436H507.492L482.569 902.106L416.03 890.401L438.894 760.436H120.641L351.487 540.355L214.693 294.921H520.784L534.93 214.511L601.47 226.215ZM519.377 692.874H734.322L587.975 553.646L688.335 362.483H577.497L519.377 692.874ZM435.971 553.16L289.421 692.874H450.779L508.899 362.483H329.697L435.971 553.16ZM681.344 162.121L652.762 223.341L587.612 192.922L616.192 131.705L681.344 162.121ZM557.365 188.027L486.983 202.733L473.165 136.601L543.547 121.894L557.365 188.027Z" fill="${colors.primary}"/>
  </svg>`;

  // Helper to calculate stats
  const calculateStats = (syllabus: any) => {
    const stats = {
      lecture: 0,
      tutorial: 0,
      practical: 0,
      personal: 0,
      exam: 0,
      total: 0,
    };

    if (!syllabus) {
      return stats;
    }

    // Total comes from syllabus duration (seconds -> hours)
    stats.total = syllabus.duration ? syllabus.duration / 3600 : 0;

    const activities = syllabus.activities || [];

    activities.forEach((a: any) => {
      const h = a.duration ? a.duration / 3600 : 0;
      // Map types to categories if possible
      const type = (a.type || "").toLowerCase();
      if (type.includes("cour") || type.includes("cm")) {
        stats.lecture += h;
      } else if (type.includes("td")) {
        stats.tutorial += h;
      } else if (type.includes("tp")) {
        stats.practical += h;
      } else if (type.includes("exam") || type.includes("ds")) {
        stats.exam += h;
      } else if (type.includes("perso")) {
        // Explicit personal work in activities (rare but possible)
        // We will add it to the sum to subtract later, or just ignore if we trust total - others
      }
    });

    // Calculate personal work as residual
    const facedTime = stats.lecture + stats.tutorial + stats.practical + stats.exam;
    stats.personal = Math.max(0, stats.total - facedTime);

    return stats;
  };

  const formatHours = (h: number) => {
    if (h === 0) {
      return "-";
    }
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, "0") : "00"}`;
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
          background: #FFFFFF;
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
          background: #FFFFFF;
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
          background: #FFFFFF;
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

        /* Modern Card - Matching App Style */
        .card {
          background: white;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 0.5px solid #E5E5EA;
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
      ${semesters
      .map(
        sem => `
        <div class="page-auto">
          <div class="card">
             <h1>Sommaire — Semestre ${sem.semester}</h1>
          </div>
          <div class="card" style="min-height: 80%;">
             <div style="margin-top: 15px; margin-bottom: 5px; font-weight: 700; font-size: 13px; color: ${colors.primary};">
                Semestre ${sem.semester}
             </div>
             ${sem.ueGroups
            .map(
              group => `
                <div style="margin-left: 10px; margin-top: 8px; font-weight: 600; font-size: 11px; color: #3A3A3C;">
                   ${group.name}
                </div>
                ${group.items
                  .map(
                    item => `
                    <div style="margin-left: 20px; border-bottom: 1px solid #F2F2F7; position: relative;">
                       <a href="#course-${sanitizeId(item.code || item.id)}" style="text-decoration: none; color: inherit; display: block; width: 100%;">
                           <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                               <span style="color: #007AFF; font-weight: 500;">${cleanHtml(item.caption?.name || item.name)}</span>
                               <span style="color: #AEAEB2;">${item.code || ""}</span>
                           </div>
                       </a>
                    </div>
                `
                  )
                  .join("")}
             `
            )
            .join("")}
          </div>
          <div class="footer">
             <span>${parcoursLabel}</span>
             <span>${year}</span>
          </div>
        </div>
      `
      )
      .join("")}

      <!-- Recap Table (Split by Semester) -->
      ${semesters
      .map(sem => {
        let rows = "";
        sem.ueGroups.forEach(group => {
          let groupCoef = 0;

          const itemRows = group.items
            .map(item => {
              const stats = calculateStats(item);
              const coef = item.coeff !== undefined ? item.coeff : ((item.exams?.reduce((acc, e) => acc + (e.weighting || 0), 0) || 0) / 100);
              groupCoef += coef;
              const subjColor = getSubjectColor(
                item.caption?.name || item.name
              );

              return `
                 <tr>
                    <td style="border:none;"></td>
                    <td>
                      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${subjColor}; margin-right:6px;"></span>
                      ${cleanHtml(item.caption?.name || item.name)}
                    </td>
                    <td align="right">${stats.lecture > 0 ? formatHours(stats.lecture) : "-"}</td>
                    <td align="right">${stats.tutorial + stats.practical > 0 ? formatHours(stats.tutorial + stats.practical) : "-"}</td>
                    <td align="right">${stats.personal > 0 ? formatHours(stats.personal) : "-"}</td>
                    <td align="right"><b>${formatHours(stats.total)}</b></td>
                    <td align="center">${coef > 0 ? coef : "-"}</td>
                 </tr>
               `;
            })
            .join("");

          rows += `
              <tr class="recap-ue-row">
                 <td></td>
                 <td colspan="5" style="text-transform:uppercase; font-size:9px; letter-spacing:0.5px;">${group.name}</td>
                 <td align="center"><b>${groupCoef}</b></td>
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
      })
      .join("")}

      <!-- Course Pages -->
      ${semesters
      .flatMap(sem =>
        sem.ueGroups.flatMap(group =>
          group.items.map(item => {
            const stats = calculateStats(item);
            const coef = item.coeff !== undefined ? item.coeff : ((item.exams?.reduce((acc, e) => acc + (e.weighting || 0), 0) || 0) / 100);
            const sColor = getSubjectColor(item.caption?.name || item.name);
            const examCount = item.exams?.length || 0;
            const hoursTotal = Math.round(stats.total);
            const hasCoeff = coef > 0;
            const gradientStyle = hasCoeff
              ? `background: linear-gradient(135deg, ${sColor}00 0%, ${sColor}20 100%), #FFFFFF;`
              : `background: #FFFFFF;`;

            return `
           <div class="page" id="course-${sanitizeId(item.code || item.id)}">
              <div class="card" style="margin-bottom: 20px; ${gradientStyle}">
                 <div class="course-header" style="border-bottom:none; margin-bottom:0; padding-bottom:0; display: flex; align-items: center;">
                    <div class="course-title-group" style="flex: 1;">
                       <h1 class="course-title" style="color: #000; font-size: 22px; margin-bottom: 4px;">${cleanHtml(item.caption?.name || item.name)}</h1>
                       
                       <div style="display: flex; gap: 8px; align-items: center; margin-top: 8px;">
                          ${examCount > 0 ? `
                          <div style="background-color: ${sColor}15; padding: 4px 10px; border-radius: 12px;">
                            <span style="color: ${sColor}; font-weight: 600; font-size: 11px;">
                              ${examCount} Évaluation${examCount > 1 ? 's' : ''}
                            </span>
                          </div>` : ''}
                          
                          ${hoursTotal > 0 ? `
                          <div style="display: flex; align-items: center; gap: 4px;">
                              <span style="font-size: 12px; font-weight: 500; color: #000;">${hoursTotal}h</span>
                              <span style="color: #8E8E93; font-size: 12px;">🕒</span>
                          </div>` : ''}
                       </div>
                    </div>

                    ${coef > 0 ? `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 16px; margin-left: auto;">
                      <div style="font-size: 24px; font-weight: 700; color: ${sColor}; line-height: 1;">${coef}</div>
                      <div style="font-size: 9px; color: ${sColor}; text-transform: uppercase; font-weight: 600; margin-top: 2px;">COEFF</div>
                    </div>` : ''}
                 </div>
              </div>

              <div class="grid">
                 <div class="col-2">
                   <!-- Description -->
                   <div class="card">
                      <h4>Description</h4>
                      ${item.caption?.goals?.fr ? `<p>${parseDeltaToText(cleanHtml(item.caption.goals.fr))}</p>` : '<p style="font-style:italic; color:#8E8E93;">Non disponible</p>'}
                   </div>

                   <!-- Acquis -->
                   ${item.caption?.program?.fr
                ? `
                      <div class="card">
                         <h4>Acquis d'Apprentissage</h4>
                         <p>${parseDeltaToText(cleanHtml(item.caption.program.fr))}</p>
                      </div>
                   `
                : ""
              }

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
                         ${stats.lecture > 0 ? `<span style="background:#E5F1FF; color:#007AFF; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">Cours: ${formatHours(stats.lecture)}</span>` : ""}
                         ${stats.tutorial > 0 ? `<span style="background:#EAF6ED; color:#34C759; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">TD: ${formatHours(stats.tutorial)}</span>` : ""}
                         ${stats.practical > 0 ? `<span style="background:#FFF8E5; color:#FF9500; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">TP: ${formatHours(stats.practical)}</span>` : ""}
                         ${stats.exam > 0 ? `<span style="background:#FFEEEE; color:#FF3B30; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600;">Exam: ${formatHours(stats.exam)}</span>` : ""}
                      </div>
                   </div>
                 </div>

                 <div class="col">
                    <!-- Referent -->
                    <div class="card">
                       <h4>Référent</h4>
                       ${item.responsables && item.responsables.length > 0
                ? item.responsables
                  .map(
                    r => `
                           <div style="display:flex; align-items:center; margin-bottom:8px;">
                              <div style="width:24px; height:24px; background:#F2F2F7; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-right:8px; color:#8E8E93; font-size:10px;">
                                ${r.firstName.charAt(0)}${r.lastName.charAt(0)}
                              </div>
                              <div style="font-weight:500;">${r.firstName} ${r.lastName}</div>
                           </div>
                         `
                  )
                  .join("")
                : '<div style="color:#8E8E93; font-style:italic;">Non renseigné</div>'
              }
                    </div>

                    <!-- Info Grid -->
                    <div class="card" style="padding: 0; overflow: hidden; position: relative; border-radius: 20px; border: 0.5px solid #E5E5EA;">
                         <!-- Vertical Divider -->
                         <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #E5E5EA;"></div>
                         
                         <!-- Row 1 -->
                         <div style="display: flex; border-bottom: 1px solid #E5E5EA;">
                             <!-- UE -->
                             <div style="flex: 1; padding: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                  <div style="color: #8E8E93; margin-bottom: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase;">UE</div>
                                  <div style="background: ${sColor}15; color: ${sColor}; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 11px;">
                                      ${getUeName(item.UE)}
                                  </div>
                             </div>
                             <!-- Coefficient -->
                             <div style="flex: 1; padding: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                  <div style="color: #8E8E93; margin-bottom: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase;">Coefficient</div>
                                  <div style="background: ${sColor}15; color: ${sColor}; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 11px;">
                                      ${item.coeff ? 'x' + item.coeff : 'Aucun'}
                                  </div>
                             </div>
                         </div>

                         <!-- Row 2 -->
                         <div style="display: flex;">
                             <!-- Duration -->
                             <div style="flex: 1; padding: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                  <div style="color: #8E8E93; margin-bottom: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase;">Durée</div>
                                  <div style="background: ${sColor}15; color: ${sColor}; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 11px;">
                                      ${formatHours(stats.total)}
                                  </div>
                             </div>
                             <!-- Min Score -->
                             <div style="flex: 1; padding: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                  <div style="color: #8E8E93; margin-bottom: 4px; font-size: 10px; font-weight: 500; text-transform: uppercase;">Note Seuil</div>
                                  <div style="background: ${sColor}15; color: ${sColor}; padding: 4px 10px; border-radius: 12px; font-weight: 700; font-size: 11px;">
                                      ${item.minScore !== undefined ? item.minScore.toFixed(2) + '/20' : '—'}
                                  </div>
                             </div>
                         </div>
                    </div>

                    <!-- Evals -->
                    ${item.exams && item.exams.length > 0
                ? `
                      <div class="card">
                         <h4>Évaluations</h4>
                         <ul class="activity-list">
                            ${item.exams
                  .map(e => {
                    const desc =
                      typeof e.description === "string"
                        ? e.description
                        : e.description?.fr ||
                        e.description?.en ||
                        "";
                    return `
                              <li class="activity-item" style="display:block;">
                                 <div style="display:flex; justify-content:space-between;">
                                    <span style="font-weight:600;">${e.typeName || e.type || "Exam"}</span>
                                    <span style="background:${colors.primary}15; color:${colors.primary}; padding:2px 6px; border-radius:4px; font-weight:700;">${e.weighting}%</span>
                                 </div>
                                 ${desc ? `<div style="font-size:9px; color:#8E8E93; margin-top:4px; line-height:1.3;">${cleanHtml(desc)}</div>` : ""}
                              </li>
                            `;
                  })
                  .join("")}
                         </ul>
                      </div>
                    `
                : ""
              }
                 </div>
              </div>

              <div class="footer">
                <span>${cleanHtml(item.caption?.name || item.name)}</span>
                <span>${year}</span>
                <span>S${sem.semester}</span>
             </div>
           </div>
         `;
          })
        )
      )
      .join("")}

    </body>
    </html>
  `;
  return html;
};
