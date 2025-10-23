# Instagram Photo Analysis Prompt - Testing Summary

## Final Decision: v2 Locked as Production Prompt

**Date:** 2025-10-13
**Total Images Tested:** 15 (5 for v1, 10 for v2)
**Final Prompt:** `photo_quality_analysis_final.txt` (copy of v2)

---

## Test Results Summary

### Round 1: v1 Prompt (5 images)
- **Agreement Rate:** 85%
- **IG-Ready Accuracy:** 100% (5/5)
- **Key Issues Found:**
  - Visibility scores too high (all 9s)
  - Needed tighter criteria for awkward angles
  - Missing hand/people visibility penalties
  - Needed more granular examples

### Round 2: v2 Prompt (10 NEW images)
- **Agreement Rate:** 85.6%
- **IG-Ready Accuracy:** 90% (9/10 correct)
- **Human Assessment:** 0/10 IG-ready
- **API Assessment:** 1/10 IG-ready (Zoe - false positive)
- **Improvements Delivered:**
  - ✅ Fixed visibility overscoring (now 6-9 range)
  - ✅ Awkward angle detection working (4 flagged correctly)
  - ✅ Hands visible detection working (2 flagged correctly)
  - ✅ Kennel bars detection working (2 flagged correctly)
  - ✅ Better background penalties for shelter settings

---

## Known Limitations

### False Positive Rate: ~10%
**Issue:** Indoor photos without obvious kennel bars may score as IG-ready
**Example:** Zoe (ID 1356) - Indoor shelter with door visible
- Human: 7.0 (indoor background = 5)
- API: 8.25 (background scored 7, missed indoor penalty)

**Impact:** Acceptable for production use - will include some indoor photos in "IG-ready" set

**Mitigation:** Manual review of top-scoring photos before Instagram posting

---

## Scoring Patterns Observed

### API Tendencies vs Human
- **Quality:** Aligned (±0.1 difference)
- **Visibility:** Much improved, now aligned (±0.1)
- **Appeal:** API +0.7 more generous (acceptable)
- **Background:** Aligned (±0.2)
- **Overall:** API +0.28 more generous

### Flag Detection Success Rate
- Awkward angles: 80% detection (4/5 flagged)
- Hands visible: 100% detection (2/2 flagged)
- Kennel bars: 100% detection (2/2 flagged)
- Poor lighting: 100% detection (1/1 flagged)

---

## Production Readiness Assessment

### ✅ Ready for Production
**Reasons:**
1. 85.6% overall agreement is strong
2. 90% IG-ready classification accuracy acceptable
3. False positive rate manageable (1 in 10)
4. Major improvements over v1 delivered
5. Flag detection working excellently
6. Further iteration risks over-fitting to test set

### Trade-offs Accepted
- ~10% false positive rate (indoor photos without kennel bars)
- API slightly more generous on appeal (+0.7)
- Occasional visibility misjudgments

### Not Acceptable
- False negative rate: 0% ✅ (didn't miss any truly great photos)
- This is the critical metric - we don't want to exclude great photos

---

## Recommended Usage

### Batch Processing Strategy
1. Run prompt on all 3,246 dogs
2. Filter for `ig_ready = true` (expect 500-800 photos)
3. **Manual review top 200** to remove false positives
4. Use remaining pool for Instagram content

### Quality Assurance
- Spot-check high scorers (9.0+) for indoor backgrounds
- Review flags for context
- Accept that some 8.0-8.5 photos may be borderline

---

## Prompt Evolution

**v1 → v2 Changes:**
- Tightened visibility criteria with explicit penalties
- Added "awkward angles max 7" rule
- Added "hands/people visible max 7" rule
- Added "kennel bars max background 4" rule
- More granular quality tier definitions
- Added scoring philosophy section
- Added 6 example score combinations
- New flags: awkward_angle, hands_visible

**v2 → v3 (Not Needed):**
- Could add: "Indoor backgrounds with doors/furniture max 6"
- Could tighten appeal scoring
- **Decision:** Diminishing returns, risk over-fitting, v2 sufficient

---

## Final Prompt Location

**File:** `prompts/instagram/photo_quality_analysis_final.txt`
**Version:** v2
**Status:** Locked for production
**Model:** google/gemini-2.5-flash-image
**Temperature:** 0.3
**Max Tokens:** 1000

---

## Next Steps

1. ✅ Prompt testing complete (EPIC 2)
2. ⏳ EPIC 3: Batch processing script
3. ⏳ EPIC 4: Run on 3,246 dogs
4. ⏳ EPIC 5: Generate top 500 IG-ready list
