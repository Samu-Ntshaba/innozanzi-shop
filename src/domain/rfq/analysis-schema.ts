import { z } from "zod";

export const rfqAnalysisSchema = z.object({
  summary: z.string().min(1),
  issuingOrganisation: z.string().nullable().default(null),
  externalReference: z.string().nullable().default(null),
  closingAt: z.string().datetime().nullable().default(null),
  briefingAt: z.string().datetime().nullable().default(null),
  submissionMethod: z.string().nullable().default(null),
  risks: z.array(z.string()).default([]),
  requirements: z.array(z.object({
    category: z.string().min(1),
    description: z.string().min(1),
    mandatory: z.boolean().default(false),
    sourceRef: z.string().nullable().default(null),
  })).default([]),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    specification: z.string().nullable().default(null),
    quantity: z.number().positive(),
    unitOfMeasure: z.string().default("each"),
  })).default([]),
  confidence: z.number().min(0).max(1),
});

export type RfqAnalysisOutput = z.infer<typeof rfqAnalysisSchema>;
