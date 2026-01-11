import { Papicons } from '@getpapillon/papicons';
import { useTheme } from "@react-navigation/native";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
=======
import { ActivityIndicator, StatusBar, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
>>>>>>> Stashed changes

import { Syllabus } from "@/services/auriga/types";
import Item from "@/ui/components/Item";
import List from "@/ui/components/List";
import Stack from "@/ui/components/Stack";
import Typography from "@/ui/components/Typography";
import adjust from "@/utils/adjustColor";
import { getSubjectColor } from "@/utils/subjects/colors";
import { getSubjectName } from "@/utils/subjects/name";

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

export default function SyllabusModal() {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ syllabusData: string }>();

<<<<<<< Updated upstream
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
=======
  // All hooks must be called before any conditional returns
  const [isLoading, setIsLoading] = React.useState(true);
>>>>>>> Stashed changes

  // Parse syllabus data from params
  const syllabus: Syllabus | null = React.useMemo(() => {
    try {
      return params.syllabusData ? JSON.parse(params.syllabusData) : null;
    } catch {
      return null;
    }
  }, [params.syllabusData]);

  const rawSubjectColor = React.useMemo(() =>
    getSubjectColor(syllabus?.caption?.name || syllabus?.name || ""),
    [syllabus]
  );

<<<<<<< Updated upstream
  const subjectColor = adjust(getSubjectColor(syllabus.name), -0.2);
  const subjectName = getSubjectName(syllabus.name);

  /* Description Section */
  const rawDescription = syllabus.caption?.goals?.fr || syllabus.caption?.name;
  const description = React.useMemo(() => cleanHtml(rawDescription), [
    rawDescription,
  ]);

  // Generate HTML for PDF based on actual syllabus data
  const generatePdfHtml = (): string => {
    const displayName = syllabus.caption?.name || subjectName;
    const dateGenerated = new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
=======
  const subjectColor = React.useMemo(() =>
    adjust(rawSubjectColor, dark ? 0.2 : -0.2),
    [rawSubjectColor, dark]
  );

  const subjectName = React.useMemo(() =>
    syllabus?.caption?.name || getSubjectName(syllabus?.name || ""),
    [syllabus]
  );

  // Calculate total hours
  const totalHours = React.useMemo(() => {
    if (syllabus?.duration && syllabus.duration > 0) {
      return Math.round(syllabus.duration / 3600);
    }
    return 0;
  }, [syllabus?.duration]);

  // Description
  const rawDescription = syllabus?.caption?.goals?.fr || syllabus?.caption?.name;
  const description = React.useMemo(() => cleanHtml(rawDescription), [rawDescription]);

  // Add a small delay to ensure data is properly loaded on Android
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100); // Small delay to ensure params are loaded

    return () => clearTimeout(timer);
  }, []);

  // Show loading indicator while data is being loaded
  if (isLoading || !syllabus) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={rawSubjectColor || colors.primary} />
        <Typography variant="body1" style={{ marginTop: 16 }}>Chargement...</Typography>
      </View>
    );
  }

  // Build sections for TableFlatList
  const sections = [];

  // Exams Section
  if (syllabus.exams && syllabus.exams.length > 0) {
    sections.push({
      title: "Examens",
      icon: <Papicons name={"Grades"} />,
      items: syllabus.exams.map((exam) => ({
        title: exam.typeName || exam.type,
        description: exam.description?.fr || exam.description?.en,
        trailing: (
          <ContainedNumber color={subjectColor} denominator="%">
            {exam.weighting}
          </ContainedNumber>
        ),
      })),
>>>>>>> Stashed changes
    });

    // Build exams section if available
    let examsHtml = '';
    if (syllabus.exams && syllabus.exams.length > 0) {
      examsHtml = `
        <div class="section">
          <h2>Évaluations (${syllabus.exams.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Coefficient</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${syllabus.exams.map(exam => {
    const examDesc = typeof exam.description === 'string'
      ? cleanHtml(exam.description)
      : cleanHtml(exam.description?.fr || exam.description?.en || '');
    return `
                  <tr>
                    <td>${exam.typeName || exam.type}</td>
                    <td>${exam.weighting}%</td>
                    <td>${examDesc || '-'}</td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Build responsables section if available
    let responsablesHtml = '';
    if (syllabus.responsables && syllabus.responsables.length > 0) {
      responsablesHtml = `
        <div class="section">
          <h2>Responsables</h2>
          <ul>
            ${syllabus.responsables.map(resp => `
              <li>${resp.firstName} ${resp.lastName}</li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Build activities section if available
    let activitiesHtml = '';
    if (syllabus.activities && syllabus.activities.length > 0) {
      activitiesHtml = `
        <div class="section">
          <h2>Activités</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              ${syllabus.activities.map(activity => `
                <tr>
                  <td>${activity.typeName || activity.type}</td>
                  <td>${activity.duration && activity.duration > 0 ? Math.round(activity.duration / 3600) + 'h' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Build description section if available
    let descriptionHtml = '';
    if (description) {
      descriptionHtml = `
        <div class="section">
          <h2>Description</h2>
          <p>${description.replace(/\n/g, '<br>')}</p>
        </div>
      `;
    }

    // Build program section if available
    let programHtml = '';
    if (syllabus.caption?.program?.fr || syllabus.caption?.program?.en) {
      const programText = cleanHtml(syllabus.caption?.program?.fr || syllabus.caption?.program?.en);
      if (programText) {
        programHtml = `
          <div class="section">
            <h2>Programme</h2>
            <p>${programText.replace(/\n/g, '<br>')}</p>
          </div>
        `;
      }
    }

    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Syllabus - ${displayName}</title>
        <style>
          @page {
            margin: 20mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 3px solid #102b65;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
          }
          h1 {
            color: #102b65;
            font-size: 28px;
            margin: 0 0 10px 0;
          }
          .subtitle {
            color: #666;
            font-size: 16px;
          }
          .info-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .info-item {
            flex: 1 1 200px;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #102b65;
          }
          .section {
            margin-bottom: 30px;
          }
          h2 {
            color: #102b65;
            font-size: 18px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #e0e0e0;
            padding: 12px;
            text-align: left;
          }
          th {
            background: #f8f9fa;
            font-weight: 600;
            color: #102b65;
          }
          tr:nth-child(even) {
            background: #fafafa;
          }
          ul {
            margin: 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">EPITA - Syllabus</div>
          <h1>${displayName}</h1>
          <div class="subtitle">${syllabus.code} • Semestre ${syllabus.semester}</div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">UE</div>
            <div class="info-value">${syllabus.UE}</div>
          </div>
          ${syllabus.duration > 0 ? `
            <div class="info-item">
              <div class="info-label">Durée</div>
              <div class="info-value">${Math.round(syllabus.duration / 3600)}h</div>
            </div>
          ` : ''}
          ${syllabus.minScore > 0 ? `
            <div class="info-item">
              <div class="info-label">Note minimum</div>
              <div class="info-value">${syllabus.minScore}/20</div>
            </div>
          ` : ''}
          ${syllabus.grade !== undefined ? `
            <div class="info-item">
              <div class="info-label">Ma note</div>
              <div class="info-value">${typeof syllabus.grade === "number" ? syllabus.grade.toFixed(2).replace(".00", "") : syllabus.grade}/20</div>
            </div>
          ` : ''}
        </div>

        ${examsHtml}
        ${responsablesHtml}
        ${activitiesHtml}
        ${descriptionHtml}
        ${programHtml}

        <div class="footer">
          Généré le ${dateGenerated} depuis Chrysalide
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);

      const html = generatePdfHtml();
      const displayName = syllabus.caption?.name || subjectName;

      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Share the generated PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Syllabus - ${displayName}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch {
      // PDF generation failed - silently handle
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 32,
      }}
    >
      {/* Header */}
      <Stack gap={8} style={{ marginBottom: 24 }}>
        <Stack direction="horizontal" gap={12} hAlign="start">
          <Stack
            width={48}
            height={48}
            card
            hAlign="center"
            vAlign="center"
            radius={32}
            backgroundColor={subjectColor + "22"}
          >
            <Text style={{ fontSize: 24 }}>📚</Text>
          </Stack>
          <Stack gap={2} style={{ flex: 1 }}>
            <Typography
              variant="h5"
              style={{ lineHeight: 24 }}
              color={subjectColor}
              textBreakStrategy="highQuality"
              android_hyphenationFrequency="full"
              lineBreakStrategyIOS="standard"
            >
              {syllabus.caption?.name || subjectName}
            </Typography>
            <Typography variant="body2" color="secondary">
              {syllabus.code} • Semestre {syllabus.semester}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      {/* Info Section */}
      <Stack gap={8} style={{ marginBottom: 24 }}>
        <Typography variant="h6">Informations</Typography>
        <List>
          <Item>
            <Typography variant="title">{syllabus.UE}</Typography>
            <Typography variant="body2" color="secondary">
              UE
            </Typography>
          </Item>

          {syllabus.duration > 0 && (
            <Item>
              <Typography variant="title">
                {Math.round(syllabus.duration / 3600)}h
              </Typography>
              <Typography variant="body2" color="secondary">
                Durée
              </Typography>
            </Item>
          )}
          {syllabus.minScore > 0 && (
            <Item>
              <Typography variant="title">{syllabus.minScore}/20</Typography>
              <Typography variant="body2" color="secondary">
                Note minimum
              </Typography>
            </Item>
          )}

        </List>
      </Stack>

      {/* Exams Section */}
      {syllabus.exams && syllabus.exams.length > 0 && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">
            Examens ({syllabus.exams.length})
          </Typography>
          <List>
            {syllabus.exams.map((exam, index) => (
              <Item key={exam.id || index}>
                <Typography variant="title">
                  {exam.typeName || exam.type}
                </Typography>
                <Typography variant="body2" color="secondary">
                  Coefficient: {exam.weighting}%
                </Typography>
                {!!exam.description && (
                  <Typography
                    variant="body2"
                    color="tertiary"
                    style={{ marginTop: 4 }}
                  >
                    {cleanHtml(
                      typeof exam.description === "string"
                        ? exam.description
                        : exam.description[
                          i18n.language.startsWith("en") ? "en" : "fr"
                        ] ||
                        exam.description.fr ||
                        exam.description.en
                    )}
                  </Typography>
                )}
              </Item>
            ))}
          </List>
        </Stack>
      )}

      {/* Responsables Section */}
      {syllabus.responsables && syllabus.responsables.length > 0 && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">Responsables</Typography>
          <List>
            {syllabus.responsables.map((resp, index) => (
              <Item key={resp.uid || index}>
                <Typography variant="title">
                  {resp.firstName} {resp.lastName}
                </Typography>
              </Item>
            ))}
          </List>
        </Stack>
      )}

      {/* Activities Section */}
      {syllabus.activities && syllabus.activities.length > 0 && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">Activités</Typography>
          <List>
            {syllabus.activities.map((activity, index) => (
              <Item key={activity.id || index}>
                <Typography variant="title">
                  {activity.typeName || activity.type}
                </Typography>
                {!!activity.duration && activity.duration > 0 && (
                  <Typography variant="body2" color="secondary">
                    {Math.round(activity.duration / 3600)}h
                  </Typography>
                )}
              </Item>
            ))}
          </List>
        </Stack>
      )}



      {/* Description Section */}
      {!!description && (
        <Stack gap={8} style={{ marginBottom: 24 }}>
          <Typography variant="h6">Description</Typography>
          <Typography variant="body1">{description}</Typography>
        </Stack>
      )}

      {/* Download PDF Button */}
      <TouchableOpacity
        onPress={handleDownloadPdf}
        disabled={isGeneratingPdf}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: colors.primary,
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: 12,
          marginTop: 8,
          opacity: isGeneratingPdf ? 0.7 : 1,
        }}
      >
        {isGeneratingPdf ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Papicons name="Download" size={20} color="#fff" />
        )}
        <Typography variant="title" style={{ color: '#fff', fontWeight: '600' }}>
          {isGeneratingPdf ? 'Génération...' : 'Télécharger en PDF'}
        </Typography>
      </TouchableOpacity>
    </ScrollView>
  );
}
