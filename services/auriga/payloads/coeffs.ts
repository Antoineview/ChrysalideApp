export const COEFFS_PAYLOAD = {
    "queryId": 1198,
    "joinIdenticalLines": false,
    "searchResultDefinition": {
        "api": "persons",
        "modelName": "Person",
        "columns": [
            {
                "guid": "bd66ef11-5c08-4185-9ac9-da087ad66ed1",
                "visible": true,
                "path": "Person",
                "api": "persons",
                "field": "person",
                "label": {
                    "en": "Pedagogical Registrations",
                    "fr": "Inscription pédagogique"
                },
                "defaultLabel": {
                    "en": "Pedagogical Registrations",
                    "fr": "Inscription pédagogique"
                },
                "modelName": "Person",
                "modelDestName": "Registration",
                "isReverted": true,
                "type": "primaryforeignkey",
                "order": null,
                "orderGlobal": null,
                "excluded": false,
                "isDisplayedInSelect": true,
                "multilingual": false,
                "isCustom": false,
                "isParameterized": null,
                "children": [
                    {
                        "guid": "20062127-df45-4141-9cfa-ed8074c8e7ae",
                        "visible": true,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "obligation",
                        "label": {
                            "en": "Pedagogical Registrations.Pedagogical component",
                            "fr": "Inscription pédagogique.Composant pédagogique"
                        },
                        "defaultLabel": {
                            "en": "Pedagogical component",
                            "fr": "Composant pédagogique"
                        },
                        "modelName": "Registration",
                        "modelDestName": "Obligation",
                        "isReverted": null,
                        "type": "primaryforeignkey",
                        "order": null,
                        "orderGlobal": null,
                        "excluded": false,
                        "isDisplayedInSelect": true,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": [
                            {
                                "guid": "a2759fe8-cee1-4c92-8e09-c02453761407",
                                "visible": true,
                                "path": "Person-Registration-person-obligation",
                                "api": "obligations",
                                "field": "code",
                                "label": {
                                    "en": "Pedagogical component.Code",
                                    "fr": "Composant pédagogique.Code"
                                },
                                "defaultLabel": {
                                    "en": "Code",
                                    "fr": "Code"
                                },
                                "modelName": "Obligation",
                                "modelDestName": null,
                                "isReverted": null,
                                "type": "code",
                                "order": 0,
                                "orderGlobal": 0,
                                "excluded": null,
                                "isDisplayedInSelect": true,
                                "multilingual": false,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": null
                            },
                            {
                                "guid": "f8c578e0-a262-4e25-99b1-155fb4e153a7",
                                "visible": true,
                                "path": "Person-Registration-person-obligation",
                                "api": "obligations",
                                "field": "caption",
                                "label": {
                                    "en": "Pedagogical component.Caption",
                                    "fr": "Composant pédagogique.Libellé"
                                },
                                "defaultLabel": {
                                    "en": "Caption",
                                    "fr": "Libellé"
                                },
                                "modelName": "Obligation",
                                "modelDestName": null,
                                "isReverted": null,
                                "type": "mlstring",
                                "order": 1,
                                "orderGlobal": 1,
                                "excluded": null,
                                "isDisplayedInSelect": true,
                                "multilingual": true,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": null
                            },
                            {
                                "guid": "8b01c6c2-f640-4982-ad0a-2fe7e1199a95",
                                "visible": true,
                                "path": "Person-Registration-person-obligation",
                                "api": "obligations",
                                "field": "obligationType",
                                "label": {
                                    "en": "Pedagogical component.Pedagogical component type",
                                    "fr": "Composant pédagogique.Type de composant pédagogique"
                                },
                                "defaultLabel": {
                                    "en": "Pedagogical component type",
                                    "fr": "Type de composant pédagogique"
                                },
                                "modelName": "Obligation",
                                "modelDestName": "ObligationType",
                                "isReverted": null,
                                "type": "foreignkey",
                                "order": null,
                                "orderGlobal": null,
                                "excluded": false,
                                "isDisplayedInSelect": true,
                                "multilingual": false,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": [
                                    {
                                        "guid": "cffc7df2-f57c-4c4b-a70f-294be7f4482c",
                                        "visible": false,
                                        "path": "Person-Registration-person-obligation-obligationType",
                                        "api": "obligationTypes",
                                        "field": "code",
                                        "label": {
                                            "en": "Pedagogical component type.Code",
                                            "fr": "Type de composant pédagogique.Code"
                                        },
                                        "defaultLabel": {
                                            "en": "Code",
                                            "fr": "Code"
                                        },
                                        "modelName": "ObligationType",
                                        "modelDestName": null,
                                        "isReverted": null,
                                        "type": "code",
                                        "order": 12,
                                        "orderGlobal": 7,
                                        "excluded": null,
                                        "isDisplayedInSelect": true,
                                        "multilingual": false,
                                        "isCustom": false,
                                        "isParameterized": null,
                                        "children": null
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "guid": "e4e17261-7cec-49a7-937d-4f37b0f9d6dd",
                        "visible": true,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "beforeResitCalculationLearner",
                        "label": {
                            "en": "Pedagogical Registrations.Calculation results before resit",
                            "fr": "Inscription pédagogique.Résultats du calcul avant rattrapage"
                        },
                        "defaultLabel": {
                            "en": "Calculation results before resit",
                            "fr": "Résultats du calcul avant rattrapage"
                        },
                        "modelName": "Registration",
                        "modelDestName": "AcademicCalculationLearner",
                        "isReverted": null,
                        "type": "foreignkey",
                        "order": null,
                        "orderGlobal": null,
                        "excluded": false,
                        "isDisplayedInSelect": true,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": [
                            {
                                "guid": "17406d3d-3896-4ace-bb72-a76a0a773f01",
                                "visible": false,
                                "path": "Person-Registration-person-beforeResitCalculationLearner",
                                "api": "academicCalculationLearners",
                                "field": "average",
                                "label": {
                                    "en": "Average",
                                    "fr": "Moyenne.Avant RATT"
                                },
                                "defaultLabel": {
                                    "en": "Average",
                                    "fr": "Moyenne"
                                },
                                "modelName": "AcademicCalculationLearner",
                                "modelDestName": null,
                                "isReverted": null,
                                "type": "numeric",
                                "order": 3,
                                "orderGlobal": 5,
                                "excluded": null,
                                "isDisplayedInSelect": false,
                                "multilingual": false,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": null
                            },
                            {
                                "guid": "3903f6cc-8fdb-4e7f-a2d7-514ecfcebd34",
                                "visible": false,
                                "path": "Person-Registration-person-beforeResitCalculationLearner",
                                "api": "academicCalculationLearners",
                                "field": "coefficient",
                                "label": {
                                    "en": "Calculation results before resit.Coefficient",
                                    "fr": "Résultats du calcul avant rattrapage.Coefficient"
                                },
                                "defaultLabel": {
                                    "en": "Coefficient",
                                    "fr": "Coefficient"
                                },
                                "modelName": "AcademicCalculationLearner",
                                "modelDestName": null,
                                "isReverted": null,
                                "type": "numeric",
                                "order": 11,
                                "orderGlobal": 14,
                                "excluded": null,
                                "isDisplayedInSelect": false,
                                "multilingual": false,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": null
                            }
                        ]
                    },
                    {
                        "guid": "fb760ff9-eee1-4337-b8e8-e063d8ae539d",
                        "visible": false,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "mark",
                        "label": {
                            "en": "Mark",
                            "fr": "Note"
                        },
                        "defaultLabel": {
                            "en": "Mark",
                            "fr": "Note"
                        },
                        "modelName": "Registration",
                        "modelDestName": null,
                        "isReverted": null,
                        "type": "numeric",
                        "order": 8,
                        "orderGlobal": 6,
                        "excluded": null,
                        "isDisplayedInSelect": false,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": null
                    },
                    {
                        "guid": "33e5f313-bce0-4cb9-9721-8b139ba42e4d",
                        "visible": true,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "finalCalculationLearner",
                        "label": {
                            "en": "Pedagogical Registrations.Final calculation results",
                            "fr": "Inscription pédagogique.Résultats du calcul final"
                        },
                        "defaultLabel": {
                            "en": "Final calculation results",
                            "fr": "Résultats du calcul final"
                        },
                        "modelName": "Registration",
                        "modelDestName": "AcademicCalculationLearner",
                        "isReverted": null,
                        "type": "foreignkey",
                        "order": null,
                        "orderGlobal": null,
                        "excluded": false,
                        "isDisplayedInSelect": true,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": [
                            {
                                "guid": "5e0375c1-68e6-4be2-998a-eae30d40fe4c",
                                "visible": true,
                                "path": "Person-Registration-person-finalCalculationLearner",
                                "api": "academicCalculationLearners",
                                "field": "coefficient",
                                "label": {
                                    "en": "Final calculation results.Coefficient",
                                    "fr": "Résultats du calcul final.Coefficient"
                                },
                                "defaultLabel": {
                                    "en": "Coefficient",
                                    "fr": "Coefficient"
                                },
                                "modelName": "AcademicCalculationLearner",
                                "modelDestName": null,
                                "isReverted": null,
                                "type": "numeric",
                                "order": 10,
                                "orderGlobal": 3,
                                "excluded": null,
                                "isDisplayedInSelect": false,
                                "multilingual": false,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": null
                            },
                            {
                                "guid": "1b104a5f-8ed0-4ef1-bc52-f0936646d0e3",
                                "visible": false,
                                "path": "Person-Registration-person-finalCalculationLearner",
                                "api": "academicCalculationLearners",
                                "field": "average",
                                "label": {
                                    "en": "Final calculation results.Average",
                                    "fr": "Résultats du calcul final.Moyenne"
                                },
                                "defaultLabel": {
                                    "en": "Average",
                                    "fr": "Moyenne"
                                },
                                "modelName": "AcademicCalculationLearner",
                                "modelDestName": null,
                                "isReverted": null,
                                "type": "numeric",
                                "order": 17,
                                "orderGlobal": 13,
                                "excluded": null,
                                "isDisplayedInSelect": false,
                                "multilingual": false,
                                "isCustom": false,
                                "isParameterized": null,
                                "children": null
                            }
                        ]
                    },
                    {
                        "guid": "26b598fb-0f89-46ed-a33f-f0397e2e26e1",
                        "visible": false,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "alphaAverageByJury",
                        "label": {
                            "en": "Pedagogical Registrations.Alpha mark by jury",
                            "fr": "Inscription pédagogique.Moyenne Alpha jury"
                        },
                        "defaultLabel": {
                            "en": "Alpha mark by jury",
                            "fr": "Moyenne Alpha jury"
                        },
                        "modelName": "Registration",
                        "modelDestName": null,
                        "isReverted": null,
                        "type": "string",
                        "order": 13,
                        "orderGlobal": 9,
                        "excluded": null,
                        "isDisplayedInSelect": false,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": null
                    },
                    {
                        "guid": "3c4a3e26-1cd7-4aa7-aaff-8b77188e1c72",
                        "visible": false,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "beforeResitAlphaAverageByJury",
                        "label": {
                            "en": "Pedagogical Registrations.Alpha mark average by jury before resit",
                            "fr": "Inscription pédagogique.Moyenne alpha jury avant rattrapage"
                        },
                        "defaultLabel": {
                            "en": "Alpha mark average by jury before resit",
                            "fr": "Moyenne alpha jury avant rattrapage"
                        },
                        "modelName": "Registration",
                        "modelDestName": null,
                        "isReverted": null,
                        "type": "string",
                        "order": 14,
                        "orderGlobal": 10,
                        "excluded": null,
                        "isDisplayedInSelect": false,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": null
                    },
                    {
                        "guid": "f2138725-2a5c-4428-98fc-72126cbd46a9",
                        "visible": false,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "averageByJury",
                        "label": {
                            "en": "Pedagogical Registrations.Mark average by jury",
                            "fr": "Inscription pédagogique.Moyenne jury"
                        },
                        "defaultLabel": {
                            "en": "Mark average by jury",
                            "fr": "Moyenne jury"
                        },
                        "modelName": "Registration",
                        "modelDestName": null,
                        "isReverted": null,
                        "type": "numeric",
                        "order": 15,
                        "orderGlobal": 11,
                        "excluded": null,
                        "isDisplayedInSelect": false,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": null
                    },
                    {
                        "guid": "210ab58f-47a8-4060-9cfb-e7cfe1510030",
                        "visible": false,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "beforeResitAverageByJury",
                        "label": {
                            "en": "Pedagogical Registrations.Mark average by jury before resit",
                            "fr": "Inscription pédagogique.Moyenne jury avant rattrapage"
                        },
                        "defaultLabel": {
                            "en": "Mark average by jury before resit",
                            "fr": "Moyenne jury avant rattrapage"
                        },
                        "modelName": "Registration",
                        "modelDestName": null,
                        "isReverted": null,
                        "type": "numeric",
                        "order": 16,
                        "orderGlobal": 12,
                        "excluded": null,
                        "isDisplayedInSelect": false,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": null
                    },
                    {
                        "guid": "86f986b4-6003-4ff3-ab0e-9be1f23dfc65",
                        "visible": false,
                        "path": "Person-Registration-person",
                        "api": "registrations",
                        "field": "alphaMark",
                        "label": {
                            "en": "Pedagogical Registrations.Alpha mark",
                            "fr": "Inscription pédagogique.Note alphanumérique"
                        },
                        "defaultLabel": {
                            "en": "Alpha mark",
                            "fr": "Note alphanumérique"
                        },
                        "modelName": "Registration",
                        "modelDestName": null,
                        "isReverted": null,
                        "type": "string",
                        "order": 4,
                        "orderGlobal": 15,
                        "excluded": null,
                        "isDisplayedInSelect": false,
                        "multilingual": false,
                        "isCustom": false,
                        "isParameterized": null,
                        "children": null
                    }
                ]
            },
            {
                "guid": "c760c5df-b0ec-4204-8a0e-6525943e2d22",
                "visible": false,
                "path": "Person",
                "api": "persons",
                "field": "LOGIN",
                "label": {
                    "en": "Login",
                    "fr": "Login"
                },
                "defaultLabel": {
                    "en": "Login",
                    "fr": "Login"
                },
                "modelName": "Person",
                "modelDestName": null,
                "isReverted": null,
                "type": "string",
                "order": 9,
                "orderGlobal": 4,
                "excluded": null,
                "isDisplayedInSelect": true,
                "multilingual": false,
                "isCustom": true,
                "isParameterized": null,
                "children": null
            },
            {
                "guid": "148900e8-3188-4be3-9aa5-1ebd2523247a",
                "visible": false,
                "path": "Person",
                "api": "persons",
                "field": "id",
                "label": {
                    "en": "ID",
                    "fr": "ID"
                },
                "defaultLabel": {
                    "en": "ID",
                    "fr": "ID"
                },
                "modelName": "Person",
                "modelDestName": null,
                "isReverted": null,
                "type": "integer",
                "order": 18,
                "orderGlobal": 8,
                "excluded": null,
                "isDisplayedInSelect": false,
                "multilingual": false,
                "isCustom": false,
                "isParameterized": true,
                "children": null
            },
            {
                "guid": "5e11520d-f41e-4503-9bf6-bdf57c9ea208",
                "visible": false,
                "path": null,
                "api": null,
                "field": "calculatedField",
                "label": {
                    "en": "Calculated field 1",
                    "fr": "VA.ToutesLettres"
                },
                "defaultLabel": {
                    "en": "Calculated field 1",
                    "fr": "Champ calculé 1"
                },
                "modelName": null,
                "modelDestName": null,
                "isReverted": null,
                "calculated": true,
                "type": "string",
                "order": 5,
                "orderGlobal": 16,
                "excluded": null,
                "operations": [
                    {
                        "operation": "cfoEqual",
                        "parameters": [
                            {
                                "function": "cffRawString",
                                "column": "86f986b4-6003-4ff3-ab0e-9be1f23dfc65",
                                "value": null,
                                "index": 0
                            },
                            {
                                "function": "cffRawString",
                                "column": null,
                                "value": "VA",
                                "index": 1
                            }
                        ]
                    },
                    {
                        "operation": "cfoIfTrueThenString",
                        "parameters": [
                            {
                                "function": "cffRaw",
                                "column": null,
                                "value": null,
                                "index": 0,
                                "previousOperation": true
                            },
                            {
                                "function": "cffRaw",
                                "column": null,
                                "value": "Validé",
                                "index": 1
                            }
                        ]
                    }
                ],
                "isDisplayedInSelect": true,
                "multilingual": null,
                "isCustom": null,
                "isParameterized": null,
                "children": null
            },
            {
                "guid": "f367ae62-4c67-4136-bb58-687f1294ba7f",
                "visible": false,
                "path": null,
                "api": null,
                "field": "calculatedField",
                "label": {
                    "en": "Calculated field 2",
                    "fr": "NV.ToutesLettres"
                },
                "defaultLabel": {
                    "en": "Calculated field 2",
                    "fr": "Champ calculé 2"
                },
                "modelName": null,
                "modelDestName": null,
                "isReverted": null,
                "calculated": true,
                "type": "string",
                "order": 6,
                "orderGlobal": 17,
                "excluded": null,
                "operations": [
                    {
                        "operation": "cfoEqual",
                        "parameters": [
                            {
                                "function": "cffRawString",
                                "column": "86f986b4-6003-4ff3-ab0e-9be1f23dfc65",
                                "value": null,
                                "index": 0
                            },
                            {
                                "function": "cffRawString",
                                "column": null,
                                "value": "NV",
                                "index": 1
                            }
                        ]
                    },
                    {
                        "operation": "cfoIfTrueThenString",
                        "parameters": [
                            {
                                "function": "cffRaw",
                                "column": null,
                                "value": null,
                                "index": 0,
                                "previousOperation": true
                            },
                            {
                                "function": "cffRaw",
                                "column": null,
                                "value": "Non validé",
                                "index": 1
                            }
                        ]
                    }
                ],
                "isDisplayedInSelect": true,
                "multilingual": null,
                "isCustom": null,
                "isParameterized": null,
                "children": null
            },
            {
                "guid": "c3d1cb8c-a754-4e09-a4d0-1047cbae4741",
                "visible": false,
                "path": null,
                "api": null,
                "field": "calculatedField",
                "label": {
                    "en": "Calculated field 3",
                    "fr": "Concat.VA.NV.ToutesLettres"
                },
                "defaultLabel": {
                    "en": "Calculated field 3",
                    "fr": "Champ calculé 3"
                },
                "modelName": null,
                "modelDestName": null,
                "isReverted": null,
                "calculated": true,
                "type": "string",
                "order": 7,
                "orderGlobal": 18,
                "excluded": null,
                "operations": [
                    {
                        "operation": "cfoConcat",
                        "parameters": [
                            {
                                "function": "cffRaw",
                                "column": "5e11520d-f41e-4503-9bf6-bdf57c9ea208",
                                "value": null,
                                "index": 0
                            },
                            {
                                "function": "cffRawString",
                                "column": "f367ae62-4c67-4136-bb58-687f1294ba7f",
                                "value": null,
                                "index": 1
                            }
                        ]
                    }
                ],
                "isDisplayedInSelect": true,
                "multilingual": null,
                "isCustom": null,
                "isParameterized": null,
                "children": null
            },
            {
                "guid": "8aeaa302-77d1-4db9-abc0-ace2940d8203",
                "visible": true,
                "path": null,
                "api": null,
                "field": "calculatedField",
                "label": {
                    "en": "Calculated field 4",
                    "fr": "Moyenne"
                },
                "defaultLabel": {
                    "en": "Calculated field 4",
                    "fr": "Champ calculé 4"
                },
                "modelName": null,
                "modelDestName": null,
                "isReverted": null,
                "calculated": true,
                "type": "string",
                "order": 2,
                "orderGlobal": 2,
                "excluded": null,
                "operations": [
                    {
                        "operation": "cfoConcat",
                        "parameters": [
                            {
                                "function": "cffRawString",
                                "column": "c3d1cb8c-a754-4e09-a4d0-1047cbae4741",
                                "value": null,
                                "index": 0
                            },
                            {
                                "function": "cffRawStringForNumeric",
                                "column": "17406d3d-3896-4ace-bb72-a76a0a773f01",
                                "value": null,
                                "index": 1
                            }
                        ]
                    }
                ],
                "isDisplayedInSelect": true,
                "multilingual": null,
                "isCustom": null,
                "isParameterized": null,
                "children": null
            }
        ],
        "hiddenFilters": null,
        "filters": {
            "booleanOperator": "and",
            "conditions": [
                {
                    "guid": "cffc7df2-f57c-4c4b-a70f-294be7f4482c",
                    "visible": null,
                    "path": "Person-Registration-person-obligation-obligationType",
                    "api": "obligationTypes",
                    "field": "code",
                    "label": null,
                    "defaultLabel": null,
                    "modelName": "ObligationType",
                    "modelDestName": null,
                    "isReverted": null,
                    "type": null,
                    "order": null,
                    "orderGlobal": null,
                    "excluded": null,
                    "operator": "notIn",
                    "value": [
                        "PROMO",
                        "PARCOURS",
                        "INS",
                        "PROGRAM",
                        "ANN",
                        "FB"
                    ],
                    "isParameterized": null,
                    "ignoreParameterized": false
                }
            ]
        },
        "filtersCustom": {
            "id": null,
            "customAttributes": null,
            "externalCode": null,
            "objectSharingDomains": null,
            "queryFilter": null
        },
        "queryTitle": {
            "fr": "Favori d'affichage - Mes notes (APP)"
        },
        "subQueries": [],
        "joinSameFields": null,
        "excluded": true,
        "lang": "fr"
    },
    "searchResultGlobal": {
        "filters": null,
        "hiddenFilters": null,
        "sorts": null,
        "columns": [],
        "dataviz": null,
        "timezone": "Europe/Paris"
    }
};