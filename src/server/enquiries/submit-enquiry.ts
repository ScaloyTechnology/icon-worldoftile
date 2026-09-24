"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/server/db";

const enquiryTypes = {
  domestic: "Domestic enquiry",
  export: "Export enquiry",
  project: "Project consultation",
  general: "General enquiry",
} as const;

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120, "Please use a shorter name."),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254),
  phone: z.string().trim().max(40, "Please use a shorter phone number."),
  enquiryType: z.enum(["domestic", "export", "project", "general"]),
  message: z.string().trim().min(10, "Please tell us a little more about your enquiry.").max(5000, "Please keep your message under 5,000 characters."),
  consent: z.string().refine((value) => value === "on", "Please confirm that ICON may respond to your enquiry."),
  website: z.string().max(0),
});

export type ContactEnquiryState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<"name" | "email" | "phone" | "enquiryType" | "message" | "consent", string[]>>;
  submissionId?: string;
};

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}

export async function submitContactEnquiry(
  _previousState: ContactEnquiryState,
  formData: FormData,
): Promise<ContactEnquiryState> {
  const parsed = enquirySchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    enquiryType: value(formData, "enquiryType"),
    message: value(formData, "message"),
    consent: value(formData, "consent"),
    website: value(formData, "website"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      fieldErrors: {
        name: flattened.name,
        email: flattened.email,
        phone: flattened.phone,
        enquiryType: flattened.enquiryType,
        message: flattened.message,
        consent: flattened.consent,
      },
    };
  }

  const input = parsed.data;

  try {
    await getDb().enquiry.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        message: `[${enquiryTypes[input.enquiryType]}]\n\n${input.message}`,
        consentAt: new Date(),
        consentVersion: "public-contact-v1",
      },
    });
    revalidatePath("/admin/enquiries");
  } catch (cause) {
    console.error("Contact enquiry submission failed", cause);
    return {
      status: "error",
      message: "We could not send your enquiry just now. Please try again or contact the team directly.",
    };
  }

  return {
    status: "success",
    message: "Thank you. Your enquiry has been sent to the ICON team.",
    submissionId: crypto.randomUUID(),
  };
}
