import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string) => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

export function validatePassword(password: string): boolean {
    const minLength = /^.{8,}$/;
    const lowercase = /[a-z]/;
    const uppercase = /[A-Z]/;
    const digit = /\d/;
    const specialChar = /[!@#$%^&*(),.?":{}|<>]/;

    return (
        minLength.test(password) &&
        lowercase.test(password) &&
        uppercase.test(password) &&
        digit.test(password) &&
        specialChar.test(password)
    );
}