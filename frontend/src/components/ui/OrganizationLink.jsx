import Link from 'next/link';

/**
 * Converts organization name to URL-safe slug
 * @param {string} name - Organization name
 * @returns {string} URL-safe slug
 */
function createOrganizationSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

/**
 * Clickable organization link component
 * @param {Object} props
 * @param {Object} props.organization - Organization object with id, name, and dog_count
 * @returns {JSX.Element}
 */
export default function OrganizationLink({ organization }) {
  const { name, dog_count } = organization;
  const slug = createOrganizationSlug(name);
  const href = `/dogs?organization=${slug}`;
  
  return (
    <Link 
      href={href}
      className="text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
      aria-label={`View ${dog_count} dogs from ${name}`}
    >
      {name} ({dog_count})
    </Link>
  );
}