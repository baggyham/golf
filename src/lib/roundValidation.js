export function isValidDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

export function validateRound(round, tournament) {
    if (!isValidDate(round.date)) {
        throw new Error('Enter a valid round date.');
    }

    if (
        round.date < tournament.startDate ||
        round.date > tournament.endDate
    ) {
        throw new Error('Round date must fall within the tournament dates.');
    }

    if (
        typeof round.name !== 'string' ||
        !round.name.trim() ||
        round.name.trim().length > 80
    ) {
        throw new Error('Round name must be between 1 and 80 characters.');
    }

    if (tournament.status !== 'draft') {
        throw new Error('Rounds can only be added while the tournament is a draft.');
    }
}
