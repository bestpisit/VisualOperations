import { UserVerificationStatus } from "@/types/prisma/UserVerificationStatus";
import { Role, User } from "@prisma/client";

export interface UserListType {
    id: User['id'];
    name: User['name'];
    email: User['email'];
    role: {
        id: Role['id'];
        name: string | null;
    };
    status: UserVerificationStatus;
}