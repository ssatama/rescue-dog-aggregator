from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import logging
from psycopg2.extras import RealDictCursor
import json

from api.dependencies import get_pooled_db_cursor
from api.models.dog import Animal
from api.services.animal_service import AnimalService
from api.models.requests import AnimalFilterRequest
from api.exceptions import handle_database_error

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/swipe")
async def get_swipe_stack(
    country: Optional[str] = Query(None, description="Filter by country code (e.g., 'GB', 'US') - DEPRECATED, use adoptable_to_country"),
    adoptable_to_country: Optional[str] = Query(None, description="Filter by adoptable to country code (e.g., 'GB', 'US')"),
    size: Optional[List[str]] = Query(None, alias="size[]", description="Filter by size (small, medium, large) - accepts multiple values"),
    age: Optional[List[str]] = Query(None, alias="age[]", description="Filter by age group (puppy, young, adult, senior) - accepts multiple values"),
    excluded: Optional[str] = Query(None, description="Comma-separated list of excluded dog IDs"),
    limit: int = Query(20, ge=1, le=50, description="Number of dogs to return (default: 20, max: 50)"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor)
) -> Dict[str, Any]:
    """
    Get a stack of dogs for the swipe feature.
    
    Returns dogs with quality LLM profiler data (quality_score > 0.7),
    ordered by a smart algorithm that prioritizes:
    1. New dogs (added within last 7 days)
    2. Dogs with high engagement scores
    3. Diverse mix of breeds and sizes
    
    Excludes dogs that have already been swiped (passed via excluded parameter).
    """
    try:
        # Parse and validate excluded IDs
        excluded_ids = []
        if excluded:
            # First validate the format to prevent SQL injection
            import re
            if not re.match(r'^[\d,\s]*$', excluded):
                raise HTTPException(status_code=400, detail="Invalid excluded IDs format. Only comma-separated numbers are allowed.")
            try:
                excluded_ids = [int(id_str.strip()) for id_str in excluded.split(',') if id_str.strip()]
            except ValueError as e:
                logger.warning(f"Invalid excluded IDs format: {excluded}")
                raise HTTPException(status_code=400, detail="Invalid excluded IDs format. Each ID must be a valid integer.")
        
        # Build the base query with quality filter
        query_parts = [
            """
            SELECT DISTINCT ON (a.id)
                a.*,
                o.name as organization_name,
                o.slug as organization_slug,
                o.logo_url as organization_logo_url,
                o.website_url as organization_website_url,
                o.country as organization_country,
                o.city as organization_city,
                o.ships_to as organization_ships_to,
                CASE 
                    WHEN a.created_at > %s THEN 1  -- New dogs (last 7 days)
                    WHEN a.dog_profiler_data->>'engagement_score' IS NOT NULL 
                        THEN CAST(a.dog_profiler_data->>'engagement_score' AS FLOAT)
                    ELSE 0.5
                END as sort_priority
            FROM animals a
            INNER JOIN organizations o ON a.organization_id = o.id
            WHERE a.status = 'available'
                AND a.animal_type = 'dog'
                AND a.dog_profiler_data IS NOT NULL
                AND (a.dog_profiler_data->>'quality_score')::float > 0.7
            """
        ]
        
        params = [datetime.now(timezone.utc) - timedelta(days=7)]
        
        # Add filters
        # Use adoptable_to_country if provided, fallback to country for backward compatibility
        filter_country = adoptable_to_country or country
        if filter_country:
            # Filter by organizations that ship to the specified country
            query_parts.append("AND o.ships_to ? %s")
            params.append(filter_country)
        
        if size:
            if isinstance(size, list) and len(size) > 0:
                # Handle multiple sizes
                placeholders = ','.join(['%s'] * len(size))
                query_parts.append(f"AND LOWER(a.size) IN ({placeholders})")
                params.extend([s.lower() for s in size])
            elif isinstance(size, str):
                # Handle single size (backward compatibility)
                query_parts.append("AND LOWER(a.size) = %s")
                params.append(size.lower())
        
        if age:
            if isinstance(age, list) and len(age) > 0:
                # Map age groups to age range conditions
                age_conditions = []
                for age_group in age:
                    age_group_lower = age_group.lower()
                    if age_group_lower == "puppy":
                        # Puppy: 0-12 months only (not including "1 year")
                        age_conditions.append("""(
                            a.age_text ~* '^([1-9]|1[0-2])\\s*(month|months|mo)' OR
                            a.properties->>'age_text' ~* '^([1-9]|1[0-2])\\s*(month|months|mo)' OR
                            a.age_text ~* '^0\\s*(year|years|yr)' OR
                            a.properties->>'age_text' ~* '^0\\s*(year|years|yr)'
                        )""")
                    elif age_group_lower == "young":
                        # Young: 13-24 months OR 1-2 years
                        age_conditions.append("""(
                            a.age_text ~* '^(1[3-9]|2[0-4])\\s*(month|months|mo)' OR
                            a.properties->>'age_text' ~* '^(1[3-9]|2[0-4])\\s*(month|months|mo)' OR
                            a.age_text ~* '^1\\s*(year|years|yr)' OR
                            a.properties->>'age_text' ~* '^1\\s*(year|years|yr)' OR
                            a.age_text ~* '^2\\s*(year|years|yr)' OR
                            a.properties->>'age_text' ~* '^2\\s*(year|years|yr)'
                        )""")
                    elif age_group_lower == "adult":
                        # Adult: 3-7 years (not including 2 years)
                        age_conditions.append("""(
                            a.age_text ~* '^[3-7]\\s*(year|years|yr)' OR
                            a.properties->>'age_text' ~* '^[3-7]\\s*(year|years|yr)' OR
                            a.age_text ~* '^3\\s*-\\s*[4-7]\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^3\\s*-\\s*[4-7]\\s*(year|years)' OR
                            a.age_text ~* '^[4-6]\\s*-\\s*7\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^[4-6]\\s*-\\s*7\\s*(year|years)'
                        )""")
                    elif age_group_lower == "senior":
                        # Senior: 8+ years
                        age_conditions.append("""(
                            a.age_text ~* '^8\\s*\\+\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^8\\s*\\+\\s*(year|years)' OR
                            a.age_text ~* '^([8-9]|1[0-9])\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^([8-9]|1[0-9])\\s*(year|years)'
                        )""")
                
                if age_conditions:
                    query_parts.append("AND (" + " OR ".join(age_conditions) + ")")
            elif isinstance(age, str):
                # Handle single age group (backward compatibility)
                age_group_lower = age.lower()
                if age_group_lower == "puppy":
                    query_parts.append("""AND (
                        a.age_text ~* '^([1-9]|1[0-2])\\s*(month|months|mo)' OR
                        a.properties->>'age_text' ~* '^([1-9]|1[0-2])\\s*(month|months|mo)' OR
                        a.age_text ~* '^0\\s*(year|years|yr)' OR
                        a.properties->>'age_text' ~* '^0\\s*(year|years|yr)'
                    )""")
                elif age_group_lower == "young":
                    query_parts.append("""AND (
                        a.age_text ~* '^(1[3-9]|2[0-4])\\s*(month|months|mo)' OR
                        a.properties->>'age_text' ~* '^(1[3-9]|2[0-4])\\s*(month|months|mo)' OR
                        a.age_text ~* '^1\\s*(year|years|yr)' OR
                        a.properties->>'age_text' ~* '^1\\s*(year|years|yr)' OR
                        a.age_text ~* '^2\\s*(year|years|yr)' OR
                        a.properties->>'age_text' ~* '^2\\s*(year|years|yr)'
                    )""")
                elif age_group_lower == "adult":
                    query_parts.append("""AND (
                        a.age_text ~* '^[3-7]\\s*(year|years|yr)' OR
                        a.properties->>'age_text' ~* '^[3-7]\\s*(year|years|yr)' OR
                        a.age_text ~* '^3\\s*-\\s*[4-7]\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^3\\s*-\\s*[4-7]\\s*(year|years)' OR
                        a.age_text ~* '^[4-6]\\s*-\\s*7\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^[4-6]\\s*-\\s*7\\s*(year|years)'
                    )""")
                elif age_group_lower == "senior":
                    query_parts.append("""AND (
                        a.age_text ~* '^8\\s*\\+\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^8\\s*\\+\\s*(year|years)' OR
                        a.age_text ~* '^([8-9]|1[0-9])\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^([8-9]|1[0-9])\\s*(year|years)'
                    )""")
        
        if excluded_ids:
            placeholders = ','.join(['%s'] * len(excluded_ids))
            query_parts.append(f"AND a.id NOT IN ({placeholders})")
            params.extend(excluded_ids)
        
        # Add ordering - deterministic algorithm with priority then id
        query_parts.append("""
            ORDER BY a.id, sort_priority DESC, 
                     a.id  -- Use id for stable, deterministic ordering
        """)
        
        # Build final query with limit and offset
        final_query = ' '.join(query_parts) + f"""
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        # Execute query
        cursor.execute(final_query, params)
        results = cursor.fetchall()
        
        # Build response
        dogs = []
        for row in results:
            # Convert row to dict if it's not already
            if hasattr(row, '_asdict'):
                animal_dict = row._asdict()
            else:
                animal_dict = dict(row)
            
            # Build organization data
            org_data = {
                'id': animal_dict.get('organization_id'),
                'name': animal_dict.get('organization_name'),
                'slug': animal_dict.get('organization_slug'),
                'logo_url': animal_dict.get('organization_logo_url'),
                'website_url': animal_dict.get('organization_website_url'),
                'country': animal_dict.get('organization_country'),
                'city': animal_dict.get('organization_city'),
                'ships_to': animal_dict.get('organization_ships_to', [])
            }
            
            # Process dog_profiler_data to ensure proper camelCase
            profiler_data = animal_dict.get('dog_profiler_data', {})
            if profiler_data:
                # Convert snake_case keys to camelCase for frontend
                camel_profiler_data = {}
                for key, value in profiler_data.items():
                    camel_key = ''.join(word.capitalize() if i > 0 else word 
                                      for i, word in enumerate(key.split('_')))
                    camel_profiler_data[camel_key] = value
                profiler_data = camel_profiler_data
            
            # Extract properties from JSONB field
            properties = animal_dict.get('properties', {}) or {}
            
            # Build animal response
            dog = {
                'id': animal_dict['id'],
                'name': animal_dict['name'],
                'animal_type': animal_dict['animal_type'],
                'breed': animal_dict.get('breed') or properties.get('breed'),
                'standardized_breed': animal_dict.get('standardized_breed'),
                'secondary_breed': properties.get('secondary_breed'),
                'mixed_breed': properties.get('mixed_breed', False),
                'age': animal_dict.get('age_text') or properties.get('age_text'),
                'sex': animal_dict.get('sex') or properties.get('sex'),
                'size': animal_dict.get('size') or properties.get('size'),
                'coat': properties.get('coat'),
                'color': properties.get('color'),
                'spayed_neutered': properties.get('spayed_neutered'),
                'house_trained': properties.get('house_trained'),
                'special_needs': properties.get('special_needs', False),
                'shots_current': properties.get('shots_current'),
                'good_with_children': properties.get('good_with_children'),
                'good_with_dogs': properties.get('good_with_dogs'),
                'good_with_cats': properties.get('good_with_cats'),
                'description': properties.get('description'),
                'status': animal_dict['status'],
                'adoption_url': animal_dict.get('adoption_url'),
                'primary_image_url': animal_dict.get('primary_image_url'),
                'images': properties.get('images', []),
                'videos': properties.get('videos', []),
                'location': properties.get('location'),
                'city': properties.get('city') or org_data.get('city'),
                'state': properties.get('state'),
                'postcode': properties.get('postcode'),
                'country': org_data.get('country'),
                'created_at': animal_dict.get('created_at').isoformat() if animal_dict.get('created_at') else None,
                'updated_at': animal_dict.get('updated_at').isoformat() if animal_dict.get('updated_at') else None,
                'organization': org_data,
                'dogProfilerData': profiler_data  # camelCase for frontend
            }
            dogs.append(dog)
        
        # Check if there are more dogs available
        check_more_query = """
            SELECT COUNT(*) as total
            FROM animals a
            INNER JOIN organizations o ON a.organization_id = o.id
            WHERE a.status = 'available'
                AND a.animal_type = 'dog'
                AND a.dog_profiler_data IS NOT NULL
                AND (a.dog_profiler_data->>'quality_score')::float > 0.7
        """
        check_params = []
        
        filter_country = adoptable_to_country or country
        if filter_country:
            check_more_query += " AND o.ships_to ? %s"
            check_params.append(filter_country)
        
        if size:
            if isinstance(size, list) and len(size) > 0:
                placeholders = ','.join(['%s'] * len(size))
                check_more_query += f" AND LOWER(a.size) IN ({placeholders})"
                check_params.extend([s.lower() for s in size])
            elif isinstance(size, str):
                check_more_query += " AND LOWER(a.size) = %s"
                check_params.append(size.lower())
        
        if age:
            if isinstance(age, list) and len(age) > 0:
                # Map age groups to age range conditions (same as main query)
                age_conditions = []
                for age_group in age:
                    age_group_lower = age_group.lower()
                    if age_group_lower == "puppy":
                        age_conditions.append("""(
                            a.age_text ~* '^(\\d+)\\s*(month|months|mo)' OR
                            a.properties->>'age_text' ~* '^(\\d+)\\s*(month|months|mo)' OR
                            a.age_text ~* '^(0|1)\\s*(year|years|yr)' OR
                            a.properties->>'age_text' ~* '^(0|1)\\s*(year|years|yr)'
                        )""")
                    elif age_group_lower == "young":
                        age_conditions.append("""(
                            a.age_text ~* '^1\\s*-\\s*2\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^1\\s*-\\s*2\\s*(year|years)' OR
                            a.age_text ~* '^2\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^2\\s*(year|years)' OR
                            a.age_text ~* '^3\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^3\\s*(year|years)'
                        )""")
                    elif age_group_lower == "adult":
                        age_conditions.append("""(
                            a.age_text ~* '^2\\s*-\\s*5\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^2\\s*-\\s*5\\s*(year|years)' OR
                            a.age_text ~* '^5\\s*-\\s*7\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^5\\s*-\\s*7\\s*(year|years)' OR
                            a.age_text ~* '^[4-7]\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^[4-7]\\s*(year|years)'
                        )""")
                    elif age_group_lower == "senior":
                        age_conditions.append("""(
                            a.age_text ~* '^8\\s*\\+\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^8\\s*\\+\\s*(year|years)' OR
                            a.age_text ~* '^([8-9]|1[0-9])\\s*(year|years)' OR
                            a.properties->>'age_text' ~* '^([8-9]|1[0-9])\\s*(year|years)'
                        )""")
                
                if age_conditions:
                    check_more_query += " AND (" + " OR ".join(age_conditions) + ")"
            elif isinstance(age, str):
                # Handle single age group (backward compatibility)
                age_group_lower = age.lower()
                if age_group_lower == "puppy":
                    check_more_query += """ AND (
                        a.age_text ~* '^(\\d+)\\s*(month|months|mo)' OR
                        a.properties->>'age_text' ~* '^(\\d+)\\s*(month|months|mo)' OR
                        a.age_text ~* '^(0|1)\\s*(year|years|yr)' OR
                        a.properties->>'age_text' ~* '^(0|1)\\s*(year|years|yr)'
                    )"""
                elif age_group_lower == "young":
                    check_more_query += """ AND (
                        a.age_text ~* '^1\\s*-\\s*2\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^1\\s*-\\s*2\\s*(year|years)' OR
                        a.age_text ~* '^[2-3]\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^[2-3]\\s*(year|years)'
                    )"""
                elif age_group_lower == "adult":
                    check_more_query += """ AND (
                        a.age_text ~* '^2\\s*-\\s*5\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^2\\s*-\\s*5\\s*(year|years)' OR
                        a.age_text ~* '^5\\s*-\\s*7\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^5\\s*-\\s*7\\s*(year|years)' OR
                        a.age_text ~* '^[4-7]\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^[4-7]\\s*(year|years)'
                    )"""
                elif age_group_lower == "senior":
                    check_more_query += """ AND (
                        a.age_text ~* '^8\\s*\\+\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^8\\s*\\+\\s*(year|years)' OR
                        a.age_text ~* '^([8-9]|1[0-9])\\s*(year|years)' OR
                        a.properties->>'age_text' ~* '^([8-9]|1[0-9])\\s*(year|years)'
                    )"""
        
        if excluded_ids:
            placeholders = ','.join(['%s'] * len(excluded_ids))
            check_more_query += f" AND a.id NOT IN ({placeholders})"
            check_params.extend(excluded_ids)
        
        cursor.execute(check_more_query, check_params)
        total_count = cursor.fetchone()['total']
        
        has_more = (offset + limit) < total_count
        
        return {
            'dogs': dogs,
            'hasMore': has_more,
            'nextOffset': offset + limit if has_more else None,
            'total': total_count
        }
        
    except Exception as e:
        logger.error(f"Error fetching swipe stack: {str(e)}")
        handle_database_error(e, "fetching swipe stack")

@router.get("/available-countries")
async def get_available_countries(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor)
) -> List[Dict[str, Any]]:
    """
    Get list of all countries that dogs can be adopted to, with dog counts.
    
    Returns a list of countries derived from the ships_to field of organizations,
    along with the count of dogs available for adoption to each country.
    """
    try:
        # Query to get all unique countries from ships_to arrays with dog counts
        query = """
            WITH country_dogs AS (
                SELECT 
                    jsonb_array_elements_text(o.ships_to) as country,
                    COUNT(DISTINCT a.id) as dog_count
                FROM organizations o
                INNER JOIN animals a ON a.organization_id = o.id
                WHERE a.status = 'available'
                    AND a.animal_type = 'dog'
                    AND a.dog_profiler_data IS NOT NULL
                    AND (a.dog_profiler_data->>'quality_score')::float > 0.7
                    AND o.ships_to IS NOT NULL
                GROUP BY jsonb_array_elements_text(o.ships_to)
            )
            SELECT 
                country,
                SUM(dog_count) as total_dogs
            FROM country_dogs
            GROUP BY country
            ORDER BY total_dogs DESC, country ASC
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        # Build response with country codes and names
        countries = []
        country_names = {
            'UK': 'United Kingdom',
            'GB': 'United Kingdom',
            'US': 'United States',
            'DE': 'Germany',
            'FR': 'France',
            'ES': 'Spain',
            'IT': 'Italy',
            'NL': 'Netherlands',
            'BE': 'Belgium',
            'AT': 'Austria',
            'CH': 'Switzerland',
            'SE': 'Sweden',
            'NO': 'Norway',
            'DK': 'Denmark',
            'FI': 'Finland',
            'PL': 'Poland',
            'CZ': 'Czech Republic',
            'HU': 'Hungary',
            'RO': 'Romania',
            'BG': 'Bulgaria',
            'GR': 'Greece',
            'PT': 'Portugal',
            'IE': 'Ireland',
            'LU': 'Luxembourg',
            'MT': 'Malta',
            'CY': 'Cyprus',
            'EE': 'Estonia',
            'LV': 'Latvia',
            'LT': 'Lithuania',
            'SK': 'Slovakia',
            'SI': 'Slovenia',
            'HR': 'Croatia',
            'BA': 'Bosnia and Herzegovina',
            'RS': 'Serbia',
            'ME': 'Montenegro',
            'MK': 'North Macedonia',
            'AL': 'Albania',
            'TR': 'Turkey',
            'SR': 'Suriname'
        }
        
        for row in results:
            country_code = row['country']
            countries.append({
                'code': country_code,
                'name': country_names.get(country_code, country_code),
                'dogCount': int(row['total_dogs'])
            })
        
        return countries
        
    except Exception as e:
        logger.error(f"Error fetching available countries: {str(e)}")
        handle_database_error(e, "fetching available countries")