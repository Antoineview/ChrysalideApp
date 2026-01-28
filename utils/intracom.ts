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
    bonus: number = 0,
    present: boolean = false
): Promise<{ success: boolean; message?: string }> => {
    try {
        // 1. Fetch Slot Infos to find correct group
        const slotRes = await fetch(`${INTRACOM_API_URL}/Events/${eventId}/SlotInfos`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!slotRes.ok) {
            return { success: false, message: "Impossible de récupérer les créneaux." };
        }

        const slotsData = await slotRes.json();
        console.log("DEBUG: Slots Data:", JSON.stringify(slotsData, null, 2));

        // 2. Find matching group
        // Logic: specific groupSlug matching semester (e.g. "prepa-spe-s3") OR generic (e.g. "prepa-spe")
        // The user prompt says: "from slot infos match the corresponding groupslug to the one in the profile "semester" by removing -sx from it"
        // Example: profile.semester = "prepa-spe-s3" -> match groupSlug "prepa-spe" or "prepa-spe-s3"

        let matchingGroup = null;
        const targetSlugFull = profile.semester.trim();
        const targetSlugShort = targetSlugFull.replace(/-s\d+$/i, '');

        console.log(`DEBUG: content of profile.semester: '${profile.semester}'`);
        console.log(`DEBUG: MATCHING ATTEMPT: Checking for slugs '${targetSlugFull}' OR '${targetSlugShort}'`);

        // Flatten all available groups
        const allGroups: { group: any; job: any; slot: any }[] = [];
        slotsData?.forEach((slotItem: any) => {
            slotItem.jobs?.forEach((job: any) => {
                job.slots?.forEach((slot: any) => {
                    slot.groups?.forEach((group: any) => {
                        allGroups.push({ group, job, slot });
                    });
                });
            });
        });

        console.log(`DEBUG: Found ${allGroups.length} total groups available.`);

        // Priority Matching
        // 1. Exact Match on Semester (e.g. "prepa-spe-s3")
        let match = allGroups.find(item => item.group.groupSlug.trim() === targetSlugFull);
        if (match) {
            console.log(`DEBUG: Exact match found: ${targetSlugFull}`);
        }

        // 2. Short Match (e.g. "prepa-spe")
        if (!match) {
            match = allGroups.find(item => item.group.groupSlug.trim() === targetSlugShort);
            if (match) {
                console.log(`DEBUG: Short match found: ${targetSlugShort}`);
            }
        }

        // 3. Wildcard Match ("students")
        if (!match) {
            match = allGroups.find(item => item.group.groupSlug.trim().toLowerCase() === "students");
            if (match) {
                console.log(`DEBUG: Wildcard 'students' match found`);
            }
        }

        matchingGroup = match ? match.group : null;

        if (!matchingGroup) {
            console.log("DEBUG: Registration failed - No matching group found");
            console.log("DEBUG: Target Slug Full:", targetSlugFull);
            console.log("DEBUG: Target Slug Short:", targetSlugShort);

            // Safe logging of available groups
            const availableGroups: string[] = [];
            slotsData?.forEach((s: any) => s.jobs?.forEach((j: any) => j.slots?.forEach((sl: any) => sl.groups?.forEach((g: any) => availableGroups.push(g.groupSlug)))));
            console.log("DEBUG: Available Groups:", availableGroups);

            return {
                success: false,
                message: `Aucun créneau trouvé pour votre semestre (${profile.semester}).`
            };
        }

        // 3. Register
        const payload = {
            studentId: parseInt(profile.studentId),
            slotGroupId: matchingGroup.id,
            present: present,
            bonus: bonus,
            registerGroupSlug: profile.semester,
            registerRegionSlug: profile.campus,
            creatorLogin: profile.login
        };

        console.log("DEBUG: Registration Payload:", JSON.stringify(payload, null, 2));

        const registerRes = await fetch(`${INTRACOM_API_URL}/Participants/Register/${eventId}`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        const resText = await registerRes.text();
        console.log(`DEBUG: Registration Response (${registerRes.status}):`, resText);

        if (registerRes.ok) {
            return { success: true };
        }
        return { success: false, message: `Erreur inscription: ${registerRes.status} - ${resText}` };


    } catch (error) {
        console.error("Error registering for event:", error);
        return { success: false, message: "Une erreur est survenue lors de l'inscription." };
    }
};
