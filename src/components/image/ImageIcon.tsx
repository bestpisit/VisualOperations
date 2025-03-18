import ImageInventoryManager from "@/images/ImageInventoryManager";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ImageFallbackProps {
    src: string;
    alt: string;
    className?: string; // ✅ Add className prop for styling
    [key: string]: any; // Allows passing additional props like width, height, etc.
}

export default function ImageIcon({ src, alt, className, ...rest }: ImageFallbackProps) {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src]);

    return (
        <Image
            {...rest}
            className={className} // ✅ Pass className to Image component
            src={imgSrc}
            alt={alt}
            onLoadingComplete={(result) => {
                if (result.naturalWidth === 0) {
                    setImgSrc(ImageInventoryManager.getImageUrl("Terraform")); // Fallback if image is broken
                }
            }}
            onError={() => {
                setImgSrc(ImageInventoryManager.getImageUrl("Terraform"));
            }}
        />
    );
}