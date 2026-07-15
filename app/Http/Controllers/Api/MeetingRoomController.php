<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingRoom;
use App\Models\MeetingReservation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MeetingRoomController extends Controller
{
    /**
     * Get all meeting rooms
     */
    public function getRooms(Request $request)
    {
        try {
            $rooms = MeetingRoom::where('is_active', true)
                ->orderBy('name')
                ->get();

            return response()->json($rooms);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Greška pri učitavanju sala',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get reservations for a specific date range
     */
    public function getReservations(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'room_id' => 'nullable|exists:meeting_rooms,id',
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Neispravni podaci',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Convert date strings to datetime for proper comparison
            $dateFrom = $request->date_from . ' 00:00:00';
            $dateTo = $request->date_to . ' 23:59:59';
            
            // Get all reservations that overlap with the date range
            // A reservation overlaps if: start_time <= dateTo AND end_time >= dateFrom
            $query = MeetingReservation::with(['room', 'creator'])
                ->where('start_time', '<=', $dateTo)
                ->where('end_time', '>=', $dateFrom);

            if ($request->room_id) {
                $query->where('room_id', $request->room_id);
            }

            $reservations = $query->orderBy('start_time')->get();

            return response()->json($reservations);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Greška pri učitavanju rezervacija',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new reservation
     */
    public function createReservation(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'room_id' => 'required|exists:meeting_rooms,id',
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'start_time' => 'required|date',
                'end_time' => 'required|date|after:start_time',
                'participants' => 'nullable|array',
                'participants.*' => 'exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Neispravni podaci',
                    'errors' => $validator->errors()
                ], 422);
            }

            $startTime = new \DateTime($request->start_time);
            $endTime = new \DateTime($request->end_time);
            $now = new \DateTime();

            // Validate that start time is not in the past
            if ($startTime < $now) {
                return response()->json([
                    'error' => 'Ne možete rezervisati termin u prošlosti',
                    'message' => 'Početak rezervacije mora biti u budućnosti ili danas'
                ], 422);
            }

            // Validate working hours (08:00-16:30)
            $startHour = (int) $startTime->format('H');
            $startMinutes = (int) $startTime->format('i');
            $endHour = (int) $endTime->format('H');
            $endMinutes = (int) $endTime->format('i');
            
            if ($startHour < 8 || $startHour > 16 || ($startHour === 16 && $startMinutes > 30)) {
                return response()->json([
                    'error' => 'Rezervacije su moguće samo u radnom vremenu',
                    'message' => 'Početak rezervacije mora biti između 08:00 i 16:30'
                ], 422);
            }
            
            if ($endHour < 8 || $endHour > 16 || ($endHour === 16 && $endMinutes > 30)) {
                return response()->json([
                    'error' => 'Rezervacije su moguće samo u radnom vremenu',
                    'message' => 'Kraj rezervacije mora biti između 08:00 i 16:30'
                ], 422);
            }

            // Check for overlaps
            if (MeetingReservation::hasOverlap(
                $request->room_id,
                $startTime,
                $endTime
            )) {
                return response()->json([
                    'error' => 'Sala je već rezervisana u ovom terminu',
                    'message' => 'Molimo izaberite drugi termin ili drugu salu'
                ], 409);
            }

            // Round times to 15-minute intervals
            $startTime = $this->roundToQuarterHour($startTime);
            $endTime = $this->roundToQuarterHour($endTime);

            $reservation = MeetingReservation::create([
                'room_id' => $request->room_id,
                'created_by' => $request->user()->id,
                'title' => $request->title,
                'description' => $request->description,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'participants' => $request->participants ?? [],
            ]);

            $reservation->load(['room', 'creator']);

            return response()->json($reservation, 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Greška pri kreiranju rezervacije',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a reservation
     */
    public function updateReservation(Request $request, $id)
    {
        try {
            $reservation = MeetingReservation::findOrFail($id);

            // Check if user is the creator
            if ($reservation->created_by !== $request->user()->id) {
                return response()->json([
                    'error' => 'Nemate dozvolu za izmjenu ove rezervacije',
                    'message' => 'Samo kreator rezervacije može je mijenjati'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'room_id' => 'sometimes|exists:meeting_rooms,id',
                'title' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'start_time' => 'sometimes|date',
                'end_time' => 'sometimes|date|after:start_time',
                'participants' => 'nullable|array',
                'participants.*' => 'exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Neispravni podaci',
                    'errors' => $validator->errors()
                ], 422);
            }

            $startTime = $request->has('start_time') 
                ? new \DateTime($request->start_time) 
                : $reservation->start_time;
            $endTime = $request->has('end_time') 
                ? new \DateTime($request->end_time) 
                : $reservation->end_time;

            // Validate working hours (08:00-16:30)
            if ($request->has('start_time')) {
                $startHour = (int) $startTime->format('H');
                $startMinutes = (int) $startTime->format('i');
                if ($startHour < 8 || $startHour > 16 || ($startHour === 16 && $startMinutes > 30)) {
                    return response()->json([
                        'error' => 'Rezervacije su moguće samo u radnom vremenu',
                        'message' => 'Početak rezervacije mora biti između 08:00 i 16:30'
                    ], 422);
                }
            }
            
            if ($request->has('end_time')) {
                $endHour = (int) $endTime->format('H');
                $endMinutes = (int) $endTime->format('i');
                if ($endHour < 8 || $endHour > 16 || ($endHour === 16 && $endMinutes > 30)) {
                    return response()->json([
                        'error' => 'Rezervacije su moguće samo u radnom vremenu',
                        'message' => 'Kraj rezervacije mora biti između 08:00 i 16:30'
                    ], 422);
                }
            }

            $roomId = $request->room_id ?? $reservation->room_id;

            // Check for overlaps (excluding current reservation)
            if (MeetingReservation::hasOverlap(
                $roomId,
                $startTime,
                $endTime,
                $reservation->id
            )) {
                return response()->json([
                    'error' => 'Sala je već rezervisana u ovom terminu',
                    'message' => 'Molimo izaberite drugi termin ili drugu salu'
                ], 409);
            }

            // Round times to 15-minute intervals
            if ($request->has('start_time')) {
                $startTime = $this->roundToQuarterHour($startTime);
            }
            if ($request->has('end_time')) {
                $endTime = $this->roundToQuarterHour($endTime);
            }

            $reservation->update([
                'room_id' => $roomId,
                'title' => $request->title ?? $reservation->title,
                'description' => $request->description ?? $reservation->description,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'participants' => $request->participants ?? $reservation->participants,
            ]);

            $reservation->load(['room', 'creator']);

            return response()->json($reservation);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Greška pri ažuriranju rezervacije',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a reservation
     */
    public function deleteReservation(Request $request, $id)
    {
        try {
            $reservation = MeetingReservation::findOrFail($id);

            // Check if user is the creator
            if ($reservation->created_by !== $request->user()->id) {
                return response()->json([
                    'error' => 'Nemate dozvolu za brisanje ove rezervacije',
                    'message' => 'Samo kreator rezervacije može je obrisati'
                ], 403);
            }

            $reservation->delete();

            return response()->json(['message' => 'Rezervacija je obrisana']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Greška pri brisanju rezervacije',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Round datetime to nearest 15-minute interval
     */
    private function roundToQuarterHour(\DateTime $dateTime): \DateTime
    {
        $minutes = (int) $dateTime->format('i');
        $roundedMinutes = round($minutes / 15) * 15;
        
        $dateTime->setTime(
            (int) $dateTime->format('H'),
            (int) $roundedMinutes,
            0
        );

        return $dateTime;
    }
}


