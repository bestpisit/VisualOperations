import { withAPIHandler } from '@/lib/middleware/apiWithMiddleware';
import { ApiError } from '@/types/api/apiError';
import prisma from '@/lib/prisma';

function validateName(name: string): string | null {
    if (!name || name.length < 3) {
        return 'Name must be at least 3 characters long.';
    }
    return null;
}

function validateEmail(email: string): string | null {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || !emailRegex.test(email)) {
        return 'Invalid email format.';
    }
    return null;
}

function validatePassword(password: string): string | null {
    const minLength = /^.{8,}$/;
    const lowercase = /[a-z]/;
    const uppercase = /[A-Z]/;
    const digit = /\d/;
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/;

    if (!password) return 'Password is required.';
    if (!minLength.test(password)) return 'Password must be at least 8 characters.';
    if (!lowercase.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!uppercase.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!digit.test(password)) return 'Password must contain at least one number.';
    if (!specialChar.test(password)) return 'Password must contain at least one special character.';
    
    return null;
}

export const POST = withAPIHandler(async (req) => {
    try {
        const { name, email, password } = await req.json();
        const errors: Record<string, string> = {};

        const nameError = validateName(name);
        if (nameError) errors.name = nameError;

        const emailError = validateEmail(email);
        if (emailError) errors.email = emailError;

        if (email) {
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                errors.email = 'Email is already in use.';
            }
        }

        const passwordError = validatePassword(password);
        if (passwordError) errors.password = passwordError;

        if (Object.keys(errors).length > 0) {
            return Response.json({ errors });
        }

        return Response.json({ success: true });
    } catch (e: any) {
        throw ApiError.internalServerError(e.message || 'Server error during validation.');
    }
});
