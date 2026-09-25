import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Dog lists on phones used to open dogs in an overlay at #dog=<slug> (until
 * #496); a shared link like that goes to the dog's own page instead. Dogs
 * without a slug were written as unknown-dog-<id>, which no page resolves. */
export function useLegacyDogHash(): void {
  const router = useRouter();
  useEffect(() => {
    const slug = window.location.hash.match(/^#dog=(.+)$/)?.[1];
    if (slug && !slug.startsWith("unknown-dog-")) router.replace(`/dogs/${slug}`);
  }, [router]);
}
