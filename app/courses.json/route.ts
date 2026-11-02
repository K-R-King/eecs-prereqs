import data from "@/data/courses.json";

// the course data as a file, so the other EECS sites (like EECS Electives) can use it
export const dynamic = "force-static";

export function GET() {
  return Response.json(data);
}
