import { z } from "zod";

export const completeProfileSchema = z.object({
 designation: z.string().min(1, "Enter your designation"),
 employmentType: z.enum(["Full Time", "Part Time", "Contract", "Intern"], { message: "Choose an employment type" }),
 joiningDate: z.string().min(1, "Enter your joining date"),
 dateOfBirth: z.string().min(1, "Enter your date of birth"),
 gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], { message: "Choose a gender" }),
 address: z.string().min(1, "Enter your address"),
 emergencyContact: z.string().min(1, "Enter an emergency contact"),
});

export type CompleteProfileFormValues = z.infer<typeof completeProfileSchema>;
