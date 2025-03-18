import prisma from "@/lib/prisma";
import { SecurityManager } from "@/lib/security/SecurityManager";

export async function rotateSecrets(newEncryptionKey: string, currentEncryptionKey: string) {
    SecurityManager.validateKey(newEncryptionKey); // Validate new key
    SecurityManager.validateKey(currentEncryptionKey);

    const secrets = await prisma.secret.findMany();

    for (const secret of secrets) {
        try {
            // Decrypt with the old key
            const decryptedValue = SecurityManager.decryptDataWithKey(secret.secret, secret.iv, secret.tag, currentEncryptionKey);

            // Re-encrypt with the new key
            const { encrypted, iv, tag } = SecurityManager.encryptDataWithKey(decryptedValue, newEncryptionKey);

            // Update the secret record
            await prisma.secret.update({
                where: { id: secret.id },
                data: { secret: encrypted, iv, tag },
            });
        } catch (error) {
            console.error(`Failed to rotate secret for ID: ${secret.id}`, error);
        }
    }

    console.log('All secrets rotated successfully.');
}