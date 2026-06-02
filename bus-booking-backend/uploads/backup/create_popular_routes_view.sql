-- Create the missing popular_routes view
-- This view was defined in schema.sql but isn't present in the target database

USE bus_booking_system;

CREATE OR REPLACE VIEW popular_routes AS
SELECT 
    r.id as route_id,
    r.origin,
    r.route_image,
    r.popularity_score,
    r.duration_minutes,
    r.base_price,
    r.distance_km,
    r.destination,
    COUNT(b.id) as booking_count,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as average_revenue
FROM routes r
JOIN schedules s ON s.route_id = r.id
JOIN bookings b ON b.schedule_id = s.id AND b.status = 'confirmed'
GROUP BY r.id, r.origin, r.destination, r.route_image, r.popularity_score, r.duration_minutes, r.base_price, r.distance_km
ORDER BY booking_count DESC;
