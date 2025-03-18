import Link from 'next/link';

interface BreadcrumbItemProps {
    href: string;
    label: string;
    isLast?: boolean;
}

const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({ href, label, isLast }) => {
    return (
        <li className="flex items-center">
            {!isLast ? (
                <>
                    <Link href={href}>
                        <p className="hover:underline">{label}</p>
                    </Link>
                    <svg
                        className="w-4 h-4 mx-2 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L11.586 9 7.293 4.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </>
            ) : (
                <span>{label}</span>
            )}
        </li>
    );
};

export default BreadcrumbItem;