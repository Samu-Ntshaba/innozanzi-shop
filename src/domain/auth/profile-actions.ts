"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireUser} from "./session";
import {prisma} from "@/lib/prisma";

const schema=z.object({name:z.string().trim().min(2).max(120),phone:z.string().trim().max(40).optional()});
export async function updateCustomerProfile(formData:FormData){const context=await requireUser(),data=schema.parse(Object.fromEntries(formData));await prisma.user.update({where:{id:context.user.id},data:{name:data.name,phone:data.phone||null}});redirect("/account/profile?saved=true")}
