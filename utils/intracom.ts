import { database } from "@/database";
import IntracomProfile from "@/database/models/IntracomProfile";



const INTRACOM_API_URL = "https://intracom.epita.fr/api";

export const getIntracomProfile = async (): Promise<IntracomProfile | null> => {
    try {
        const profiles = await database.get<IntracomProfile>('intracom_profile').query().fetch();
        return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
        console.error("Error getting Intracom profile from DB:", error);
        return null;
    }
};

export const fetchIntracomProfile = async (token: string): Promise<IntracomProfile | null> => {
    try {
        const response = await fetch(`${INTRACOM_API_URL}/Students/me`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.error("Failed to fetch Intracom profile:", response.status);
            return null;
        }

        const data = await response.json();

        // Save to DB
        return await database.write(async () => {
            const profiles = await database.get<IntracomProfile>('intracom_profile').query().fetch();
            let profile: IntracomProfile;

            if (profiles.length > 0) {
                profile = profiles[0];
                await profile.update(p => {
                    p.login = data.login;
                    p.studentId = String(data.id);
                    p.campus = data.campus;
                    p.semester = data.semester;
                    p.firstName = data.firstName;
                    p.lastName = data.lastName;
                    p.email = data.email;
                    p.data = JSON.stringify(data);
                });
            } else {
                profile = await database.get<IntracomProfile>('intracom_profile').create(p => {
                    p.login = data.login;
                    p.studentId = String(data.id);
                    p.campus = data.campus;
                    p.semester = data.semester;
                    p.firstName = data.firstName;
                    p.lastName = data.lastName;
                    p.email = data.email;
                    p.data = JSON.stringify(data);
                });
            }
            return profile;
        });

    } catch (error) {
        console.error("Error fetching/saving Intracom profile:", error);
        return null;
    }
};

export const registerForEvent = async (
    eventId: number,
    token: string,
    profile: IntracomProfile,
    eventDetails: any, // Pass the event object to save it
    bonus: number = 0,
    present: boolean = false
): Promise<{ success: boolean; message?: string }> => {
    try {
        // 1. Fetch Available Slot Group directly
        const slotRes = await fetch(`${INTRACOM_API_URL}/Students/Event/${eventId}/AvailableSlotGroup`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!slotRes.ok) {
            console.log("DEBUG: Failed to fetch AvailableSlotGroup", slotRes.status);
            return { success: false, message: "Impossible de récupérer votre groupe de créneau." };
        }

        const availableSlots = await slotRes.json();
        console.log("DEBUG: AvailableSlotGroup response:", JSON.stringify(availableSlots, null, 2));

        if (!availableSlots || availableSlots.length === 0) {
            return {
                success: false,
                message: `Aucun créneau disponible trouvé pour votre profil.`
            };
        }

        const targetGroup = availableSlots[0];

        const tryRegistration = async (idToUse: number) => {
            console.log(`DEBUG: Attempting registration with ID: ${idToUse}`);

            // NOTE based on user input:
            // POST /api/Participants/Register/{groupId} (or slotId)
            // Empty body (Content-Length: 0)
            const registerRes = await fetch(`${INTRACOM_API_URL}/Participants/Register/${idToUse}`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                // body: undefined // explicitly no body
            });

            const resText = await registerRes.text();
            console.log(`DEBUG: Registration Response (${registerRes.status}):`, resText);

            return { ok: registerRes.ok, status: registerRes.status, text: resText };
        };

        // 2. Try with Group ID (targetGroup.id)
        let attempt = await tryRegistration(targetGroup.id);

        // Retry logic
        if (!attempt.ok) {
            console.log("DEBUG: First attempt with Group ID failed. Retrying with Slot ID...");
            attempt = await tryRegistration(targetGroup.slotId);
        }

        if (attempt.ok) {
            // 4. Save to Local DB
            if (eventDetails) {
                try {
                    await database.write(async () => {
                        const existing = await database.get<IntracomRegisteredEvent>('intracom_registered_events').query().fetch();
                        const exists = existing.find(e => e.eventId === eventId); // Basic check, better to use proper query if possible

                        if (!exists) {
                            await database.get<IntracomRegisteredEvent>('intracom_registered_events').create(e => {
                                e.eventId = eventId;
                                e.date = new Date(eventDetails.eventDate || Date.now()).getTime();
                                e.type = eventDetails.type;
                                e.name = eventDetails.title;
                                e.campusSlug = eventDetails.campus;
                                e.registeredStudents = eventDetails.nbNewStudents || 0; // approximate
                                e.nbNewStudents = eventDetails.nbNewStudents || 0;
                                e.maxStudents = 999; // Unknown
                                e.state = eventDetails.state;
                                e.createdByAccount = eventDetails.suggestionCreatorLogin || "unknown";
                                e.address = eventDetails.address;
                                e.zipcode = eventDetails.zipcode;
                                e.town = eventDetails.town;
                                e.latitude = eventDetails.latitude;
                                e.longitude = eventDetails.longitude;
                            });
                            console.log("DEBUG: Event saved to local DB");
                        }
                    });
                } catch (dbError) {
                    console.error("Error saving registered event to DB:", dbError);
                }
            }
            return { success: true };
        }

        return { success: false, message: `Erreur inscription: ${attempt.status} - ${attempt.text}` };


    } catch (error) {
        console.error("Error registering for event:", error);
        return { success: false, message: "Une erreur est survenue lors de l'inscription." };
    }
};
