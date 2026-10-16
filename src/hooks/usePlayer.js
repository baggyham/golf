import {useEffect, useState} from 'react';
import {getPlayer} from '../repositories/playerRepository.js';

export function usePlayer(playerId) {
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        if (!playerId) {
            return;
        }

        getPlayer(playerId)
            .then((data) => {
                if (active) {
                    setPlayer(data);
                    setError(null);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (active) {
                    setPlayer(null);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [playerId]);

    return {player, loading, error};
}
