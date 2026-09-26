"""Seed the local database with synthetic dogs for development and cloud sessions.

Spreads about 250 available dogs over the active organizations, with varied
breed, age, size and sex. Most dogs carry an AI profile, but one organization
gets none, so the UI's "missing data" paths stay visible, and one organization
gets no dogs at all. Photos are real public images from images.rescuedogs.me.

Refuses to run unless DB_HOST is localhost, and never with DATABASE_URL or
RAILWAY_DATABASE_URL set, since either one would point it at production.

Usage:
    uv run python management/seed_dev_data.py              # add dogs
    uv run python management/seed_dev_data.py --if-empty   # only when animals is empty
"""

import argparse
import os
import random
import re
import sys
from datetime import UTC, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

IMAGE_BASE = "https://images.rescuedogs.me/rescue_dogs"

# (path under IMAGE_BASE, width, height), measured from the published files.
PHOTOS = [
    ("pets_in_turkey/karamel_a012c8cc.jpg", 1082, 1600),
    ("pets_in_turkey/ralph_0d0e5438.jpg", 665, 1182),
    ("rean_(rescuing_european_animals_in_need)/louis_eb8ef46f.jpg", 1200, 1599),
    ("rean_(rescuing_european_animals_in_need)/daphne_3381dbc2.jpg", 443, 590),
    ("rean_(rescuing_european_animals_in_need)/sunny_d0fb0c4e.jpg", 443, 590),
    ("tierschutzverein_europa_e.v./charly_b4f7a58e.jpg", 600, 600),
    ("tierschutzverein_europa_e.v./greta_cbd0d00e.jpg", 600, 600),
    ("tierschutzverein_europa_e.v./pardo_aeedba6d.jpg", 600, 600),
    ("tierschutzverein_europa_e.v./julieta_163ddb13.jpg", 600, 600),
    ("daisy_family_rescue_e.v./bruno_d7dda8d4.jpg", 768, 1024),
    ("daisy_family_rescue_e.v./toki_dfe308c7.jpg", 768, 1024),
    ("misis_animal_rescue/aks_6c8504d1.jpg", 800, 800),
    ("misis_animal_rescue/freya_0513f1e1.jpg", 800, 800),
    ("misis_animal_rescue/olly_be01f24a.jpg", 800, 800),
    ("the_underdog/teddy_cfeaa1a9.jpg", 1500, 1500),
    ("the_underdog/jett_2cb9e043.jpg", 864, 864),
    ("animal_rescue_bosnia/marvel_ee6c96e1.jpg", 300, 300),
    ("animal_rescue_bosnia/vina_e6fe15b7.jpg", 300, 300),
    ("woof_project/sarita_5290086c.jpg", 1536, 2048),
    ("woof_project/sora_e8087cac.jpg", 1200, 1600),
    ("santer_paws_bulgarian_rescue/huckleberry_260bcfa9.jpg", 800, 800),
    ("santer_paws_bulgarian_rescue/mabel_d4d27cae.jpg", 1024, 1024),
    ("many_tears_animal_rescue/narla_01c08beb.jpg", 640, 640),
    ("many_tears_animal_rescue/zippy_7e915afc.jpg", 640, 640),
    ("many_tears_animal_rescue/maggie_86dd9fff.jpg", 640, 640),
    ("dogs_trust/bramble_7b5b10a5.jpg", 800, 600),
    ("dogs_trust/treacle_57665a76.jpg", 800, 600),
    ("dogs_trust/george_891dd5af.jpg", 800, 600),
]

# (standardized_breed, primary_breed, breed_group, breed_type, size)
BREEDS = [
    ("Mixed Breed", "Mixed Breed", "Mixed", "mixed", "Medium"),
    ("Mixed Breed", "Mixed Breed", "Mixed", "mixed", "Small"),
    ("Mixed Breed", "Mixed Breed", "Mixed", "mixed", "Large"),
    ("Labrador Retriever", "Labrador Retriever", "Sporting", "purebred", "Large"),
    ("Labrador Retriever Cross", "Labrador Retriever", "Sporting", "crossbreed", "Large"),
    ("German Shepherd Dog", "German Shepherd Dog", "Herding", "purebred", "Large"),
    ("Border Collie", "Border Collie", "Herding", "purebred", "Medium"),
    ("Staffordshire Bull Terrier", "Staffordshire Bull Terrier", "Terrier", "purebred", "Medium"),
    ("Jack Russell Terrier", "Jack Russell Terrier", "Terrier", "purebred", "Small"),
    ("Jack Russell Terrier Cross", "Jack Russell Terrier", "Terrier", "crossbreed", "Small"),
    ("Galgo Español", "Galgo Español", "Hound", "purebred", "Large"),
    ("Podenco", "Podenco", "Hound", "purebred", "Medium"),
    ("Beagle", "Beagle", "Hound", "purebred", "Medium"),
    ("Chihuahua", "Chihuahua", "Toy", "purebred", "Tiny"),
    ("Yorkshire Terrier", "Yorkshire Terrier", "Toy", "purebred", "Tiny"),
    ("Siberian Husky", "Siberian Husky", "Working", "purebred", "Large"),
    ("Cane Corso", "Cane Corso", "Guardian", "purebred", "Large"),
    ("Cocker Spaniel", "Cocker Spaniel", "Sporting", "purebred", "Medium"),
    ("Cockapoo", "Cockapoo", "Designer/Hybrid", "crossbreed", "Small"),
    ("Unknown", "Unknown", "Unknown", "unknown", None),
]

NAMES = (
    "Luna Max Bella Rocky Nala Toby Daisy Milo Lola Bruno Rosie Teddy Maya Buddy Kira Oscar Lucy Charlie Zara "
    "Leo Ruby Finn Nora Jack Mia Duke Ellie Rex Coco Sam Lilly Ozzy Pepa Balu Frida Ringo Sasha Loki Hazel Otto "
    "Willow Bear Juno Diesel Honey Archie Bonnie Shadow Poppy Marley Skye Ziggy Tilly Hugo Pixie Bandit Mabel "
    "Rufus Olive Chico Nova Gus Penny Rolo Ivy Brutus Sunny Zeus Dotty Ralph Greta Pardo Lenny Pip"
).split()

AGE_BANDS = [
    # (min_months, max_months, label, weight)
    (2, 6, "{m} months", 2),
    (7, 18, "{m} months", 3),
    (24, 84, "{y} years", 5),
    (96, 156, "{y} years", 2),
]

TRAITS = ["playful", "gentle", "curious", "loyal", "calm", "affectionate", "clever", "cheeky", "shy at first", "energetic", "cuddly", "independent"]
ACTIVITIES = ["long walks", "playing fetch", "sniffing adventures", "sofa cuddles", "swimming", "tug of war", "car rides", "puzzle toys", "zoomies in the garden"]
QUIRKS = [
    "Sleeps upside down with all four paws in the air",
    "Carries a sock around as a comfort toy",
    "Howls along to the doorbell",
    "Insists on sitting on feet",
    None,
]


def refuse_unless_local() -> None:
    # Importing config loads .env first, so variables set only there are checked too.
    from config import DB_CONFIG

    for var in ("DATABASE_URL", "RAILWAY_DATABASE_URL"):
        if os.environ.get(var):
            sys.exit(f"seed_dev_data: refusing to run with {var} set; it points at production.")
    if os.environ.get("DB_HOST") != "localhost" or DB_CONFIG["host"] != "localhost":
        sys.exit(f"seed_dev_data: DB_HOST must be localhost (got {os.environ.get('DB_HOST')!r}).")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def age_fields(rng: random.Random) -> tuple[str, int, int]:
    lo, hi, label, _ = rng.choices(AGE_BANDS, weights=[band[3] for band in AGE_BANDS])[0]
    months = rng.randint(lo, hi)
    if "{y}" in label:
        years = months // 12
        return label.format(y=years), years * 12, years * 12 + 11
    return label.format(m=months), months, months + 1


def profile(rng: random.Random, name: str, breed: str, now: datetime) -> dict:
    traits = rng.sample(TRAITS, 4)
    activities = rng.sample(ACTIVITIES, 3)
    data = {
        "name": name,
        "breed": breed,
        "tagline": f"{traits[0].capitalize()}, {traits[1]} and ready for a sofa of their own",
        "description": (f"{name} is a {traits[0]}, {traits[1]} dog who loves {activities[0]} and {activities[1]}. Foster carers describe {name} as {traits[2]} and quick to settle into a routine."),
        "personality_traits": traits,
        "favorite_activities": activities,
        "unique_quirk": rng.choice(QUIRKS),
        "energy_level": rng.choice(["low", "medium", "high", "very_high"]),
        "trainability": rng.choice(["easy", "moderate", "challenging"]),
        "sociability": rng.choice(["very_social", "social", "selective", "independent"]),
        "confidence": rng.choice(["very_confident", "confident", "moderate", "shy"]),
        "home_type": rng.choice(["apartment_ok", "house_preferred", "house_required"]),
        "experience_level": rng.choice(["first_time_ok", "some_experience", "experienced_only"]),
        "exercise_needs": rng.choice(["minimal", "moderate", "high"]),
        "grooming_needs": rng.choice(["minimal", "weekly", "frequent"]),
        "good_with_dogs": rng.choice(["yes", "yes", "no", "maybe", "unknown"]),
        "good_with_cats": rng.choice(["yes", "no", "with_training", "unknown"]),
        "good_with_children": rng.choice(["yes", "maybe", "unknown"]),
        "yard_required": rng.random() < 0.3,
        "neutered": rng.random() < 0.7,
        "vaccinated": rng.random() < 0.8,
        "ready_to_travel": rng.random() < 0.6,
        "medical_needs": None,
        "special_needs": None,
        "quality_score": round(rng.uniform(60, 95), 1),
        "model_used": "seed_dev_data",
        "profiled_at": now.isoformat(),
        "profiler_version": "1.0.0",
        "prompt_version": "1.0.0",
    }
    # Real profiles leave fields out when the source text doesn't say; so do some of these.
    for field in ("good_with_children", "good_with_cats", "unique_quirk"):
        if rng.random() < 0.25:
            data[field] = None
    return data


def seed(count: int, if_empty: bool) -> int:
    import psycopg2
    from psycopg2.extras import Json

    from config import DB_CONFIG

    conn = psycopg2.connect(
        host=DB_CONFIG["host"],
        port=DB_CONFIG["port"],
        dbname=DB_CONFIG["database"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"] or None,
    )
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM animals")
            existing = cur.fetchone()[0]
            if if_empty and existing:
                print(f"animals already has {existing} rows; nothing seeded.")
                return 0

            cur.execute("SELECT id, name, website_url FROM organizations WHERE active ORDER BY id")
            orgs = cur.fetchall()
            if len(orgs) < 3:
                sys.exit("seed_dev_data: need at least 3 active organizations; run management/config_commands.py sync first.")

            # The last organization gets no dogs, the one before it dogs without AI profiles.
            with_dogs = orgs[:-1]
            unprofiled_org_id = with_dogs[-1][0]

            rng = random.Random(484)
            now = datetime.now(UTC).replace(tzinfo=None)
            for i in range(count):
                org_id, _org_name, website = with_dogs[i % len(with_dogs)]
                name = rng.choice(NAMES)
                standardized, primary, group, breed_type, size = rng.choice(BREEDS)
                age_text, age_min, age_max = age_fields(rng)
                sex = rng.choice(["Male", "Female"])
                photos = rng.sample(PHOTOS, rng.choice([1, 1, 2, 3, 4]))
                images = [{"url": f"{IMAGE_BASE}/{path}", "width": w, "height": h} for path, w, h in photos]
                created = now - timedelta(days=rng.randint(0, 200))
                profiled = org_id != unprofiled_org_id and rng.random() < 0.9
                description = f"{name} is looking for a home. Seeded development data, not a real dog."

                cur.execute(
                    """
                    INSERT INTO animals (
                        name, organization_id, animal_type, external_id, primary_image_url, original_image_url,
                        images, adoption_url, status, breed, breed_raw, standardized_breed, primary_breed,
                        breed_group, breed_type, breed_slug, age_text, age_min_months, age_max_months, sex,
                        size, standardized_size, properties, dog_profiler_data, created_at, updated_at,
                        last_scraped_at, last_seen_at, availability_confidence, active
                    ) VALUES (
                        %s, %s, 'dog', %s, %s, %s, %s, %s, 'available', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, 'high', true
                    ) RETURNING id
                    """,
                    (
                        name,
                        org_id,
                        f"seed-{org_id}-{i}",
                        images[0]["url"],
                        images[0]["url"],
                        Json(images),
                        f"{website.rstrip('/')}/#seed-{i}",
                        standardized,
                        standardized,
                        standardized,
                        primary,
                        group,
                        breed_type,
                        slugify(primary),
                        age_text,
                        age_min,
                        age_max,
                        sex,
                        size,
                        size,
                        Json({"description": description, "sex": sex, "age_text": age_text}),
                        Json(profile(rng, name, standardized, now)) if profiled else None,
                        created,
                        now,
                        now,
                        now,
                    ),
                )
                animal_id = cur.fetchone()[0]
                cur.execute(
                    "UPDATE animals SET slug = %s WHERE id = %s",
                    (f"{slugify(name)}-{slugify(primary)}-{animal_id}", animal_id),
                )

            cur.execute(
                """
                UPDATE organizations o
                SET total_dogs = (SELECT count(*) FROM animals a WHERE a.organization_id = o.id AND a.active)
                """
            )
        print(f"Seeded {count} dogs across {len(with_dogs)} organizations (org {unprofiled_org_id} without AI profiles, org {orgs[-1][0]} with no dogs).")
        return count
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, default=250, help="number of dogs to add (default 250)")
    parser.add_argument("--if-empty", action="store_true", help="do nothing when the animals table already has rows")
    args = parser.parse_args()

    refuse_unless_local()
    seed(args.count, args.if_empty)


if __name__ == "__main__":
    main()
