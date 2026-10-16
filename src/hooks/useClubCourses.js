import { useEffect, useRef, useState } from 'react';
import { getClubCourses } from '../services/golfApi.js';

export function useClubCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const controllerRef = useRef(null);

    useEffect(() => {
        return () => controllerRef.current?.abort();
    }, []);

    async function loadCourses(clubId) {
        // Cancel any previous request.
        controllerRef.current?.abort();

        const controller = new AbortController();
        controllerRef.current = controller;

        setLoading(true);
        setError(null);
        setCourses([]);

        try {
            const data = await getClubCourses(clubId, {
                signal: controller.signal,
            });

            if (!controller.signal.aborted) {
                setCourses(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            if (!controller.signal.aborted) {
                setError(err.message);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }

    return {
        courses,
        loading,
        error,
        loadCourses,
    };
}