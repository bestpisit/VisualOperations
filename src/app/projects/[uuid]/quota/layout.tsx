import { withAuthAndAdminServer } from "@/lib/middleware/serverWithMiddleware";

export default async function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await withAuthAndAdminServer();

    return (
        children
    );
}