-- Enable realtime for synthesis rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.syntheses;