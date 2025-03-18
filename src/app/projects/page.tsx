import { auth } from "@/auth"
import ProjectsPage from "./ProjectsPage"
import { ROUTES } from "@/lib/route";
import { redirect } from "next/navigation";
import { readProjects } from "../api/projects/function";

const Project = async () => {
    const session = await auth();

    if (!session || !session.user) {
        return redirect(ROUTES.LOGIN);
    }

    const projects = await readProjects(session.user.id, 10);

    return (
        <ProjectsPage projects={projects}/>
    )
}

export default Project