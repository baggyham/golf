export function validateScorecard(holes) {
    if (!Array.isArray(holes) || holes.length !== 18) {
        throw new Error('A scorecard must contain 18 holes.');
    }

    const strokeIndices = new Set();

    holes.forEach((hole, index) => {
        if (hole.number !== index + 1) {
            throw new Error(`Invalid hole number at position ${index + 1}.`);
        }

        if (
            !Number.isInteger(hole.par) ||
            hole.par < 3 ||
            hole.par > 6
        ) {
            throw new Error(`Invalid par on hole ${hole.number}.`);
        }

        if (
            !Number.isInteger(hole.strokeIndex) ||
            hole.strokeIndex < 1 ||
            hole.strokeIndex > 18
        ) {
            throw new Error(`Invalid stroke index on hole ${hole.number}.`);
        }

        if (strokeIndices.has(hole.strokeIndex)) {
            throw new Error(`Duplicate stroke index ${hole.strokeIndex}.`);
        }

        strokeIndices.add(hole.strokeIndex);
    });

    return true;
}