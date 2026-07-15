<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Evidencija Kontrole - {{ $record->id ?? 'N/A' }}</title>
    <style>
        @page { margin: 15mm; }
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 10pt; }
        h1 { font-size: 18pt; text-align: center; margin-bottom: 10px; }
        h2 { font-size: 14pt; margin-top: 15px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table th { background-color: #333; color: white; padding: 8px; text-align: left; font-size: 9pt; }
        table td { padding: 5px; border: 1px solid #ddd; font-size: 9pt; }
        .info-table { border: 0; }
        .info-table td { border: 0; padding: 3px 5px; }
        .info-table td:first-child { font-weight: bold; width: 40%; }
        .signature-box { border: 1px solid #000; padding: 10px; margin-top: 10px; min-height: 60px; }
    </style>
</head>
<body>
    <h1>EVIDENCIJA KONTROLE I OBILASKA</h1>
    <p style="text-align: center; font-size: 12pt;"><strong>ID: {{ $record->id ?? 'N/A' }}</strong> | Status: 
        @if(isset($record->status) && $record->status === 'finalized')
            FINALIZOVANO
        @elseif(isset($record->status) && $record->status === 'locked')
            ZAKLJUČANO
        @else
            DRAFT
        @endif
    </p>

    <h2>1. OSNOVNI PODACI</h2>
    <table class="info-table">
        <tr>
            <td>Prodavnica:</td>
            <td>{{ $store->name ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td>Šifra prodavnice:</td>
            <td>{{ $store->code ?? $record->store_code ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td>Lokacija:</td>
            <td>{{ ($store->city ?? '') . ', ' . ($store->address ?? '') }}</td>
        </tr>
        <tr>
            <td>Tip kontrole:</td>
            <td>
                @if(isset($record->control_type) && $record->control_type === 'total_inventory')
                    Totalna inventura
                @elseif(isset($record->control_type) && $record->control_type === 'inspection')
                    Obilazak / kontrola
                @else
                    N/A
                @endif
            </td>
        </tr>
        <tr>
            <td>Datum kontrole:</td>
            <td>
                @if(isset($record->control_date_from))
                    {{ \Carbon\Carbon::parse($record->control_date_from)->format('d.m.Y') }}
                    @if(isset($record->control_date_to) && $record->control_date_to)
                        - {{ \Carbon\Carbon::parse($record->control_date_to)->format('d.m.Y') }}
                    @endif
                @else
                    N/A
                @endif
            </td>
        </tr>
        @if((isset($record->start_time) && $record->start_time) || (isset($record->end_time) && $record->end_time))
        <tr>
            <td>Vrijeme:</td>
            <td>
                @if(isset($record->start_time) && $record->start_time) {{ $record->start_time }} @endif
                @if(isset($record->start_time) && $record->start_time && isset($record->end_time) && $record->end_time) - @endif
                @if(isset($record->end_time) && $record->end_time) {{ $record->end_time }} @endif
            </td>
        </tr>
        @endif
    </table>

    @if($participants->count() > 0)
    <h2>2. UČESNICI KONTROLE</h2>
    <table>
        <thead>
            <tr>
                <th>Ime i prezime</th>
                <th>Funkcija</th>
                <th>Email</th>
            </tr>
        </thead>
        <tbody>
            @foreach($participants as $participant)
            <tr>
                <td>{{ $participant->user_name ?? $participant->name ?? 'N/A' }}</td>
                <td>{{ $participant->function ?? 'N/A' }}</td>
                <td>{{ $participant->user_email ?? 'N/A' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    @if($presentPersons->count() > 0)
    <h2>3. PRISUTNE OSOBE U PRODAVNICI</h2>
    <table>
        <thead>
            <tr>
                <th>Ime i prezime</th>
                <th>Funkcija</th>
                <th>Email</th>
            </tr>
        </thead>
        <tbody>
            @foreach($presentPersons as $person)
            <tr>
                <td>{{ $person->employee_name ?? $person->name ?? 'N/A' }}</td>
                <td>{{ $person->function ?? 'N/A' }}</td>
                <td>{{ $person->employee_email ?? 'N/A' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    @if(isset($record->control_type) && $record->control_type === 'total_inventory')
    <h2>4. TOTALNA INVENTURA</h2>
    @if($record->total_book_value || $record->total_counted_value)
    <table class="info-table">
        <tr>
            <td>Ukupna knjigovodstvena vrijednost:</td>
            <td>{{ number_format($record->total_book_value ?? 0, 2, ',', '.') }} KM</td>
        </tr>
        <tr>
            <td>Ukupna popisana vrijednost:</td>
            <td>{{ number_format($record->total_counted_value ?? 0, 2, ',', '.') }} KM</td>
        </tr>
        <tr>
            <td>Razlika ukupno:</td>
            <td>{{ number_format($record->total_difference ?? 0, 2, ',', '.') }} KM</td>
        </tr>
        <tr>
            <td>Status inventure:</td>
            <td>
                @if($record->inventory_status === 'no_difference')
                    Bez razlike
                @elseif($record->inventory_status === 'shortage')
                    Manjak
                @elseif($record->inventory_status === 'surplus')
                    Višak
                @elseif($record->inventory_status === 'combined')
                    Kombinovano
                @else
                    N/A
                @endif
            </td>
        </tr>
    </table>
    @endif
    @endif

    @if(isset($record->control_type) && $record->control_type === 'inspection')
    <h2>5. OBILAZAK I ZAPAŽANJA</h2>
    @if($record->store_rating)
    <p><strong>Opšta ocjena prodavnice:</strong> {{ $record->store_rating }}/5</p>
    @endif
    @endif

    @if($measures->count() > 0)
    <h2>6. NALOŽENE MJERE</h2>
    <table>
        <thead>
            <tr>
                <th>Mjera</th>
                <th>Odgovorna osoba</th>
                <th>Rok</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($measures as $measure)
            <tr>
                <td>{{ $measure->measure ?? '-' }}</td>
                <td>{{ $measure->responsible_name ?? $measure->responsible_user_name ?? '-' }}</td>
                <td>{{ isset($measure->deadline) && $measure->deadline ? \Carbon\Carbon::parse($measure->deadline)->format('d.m.Y') : 'N/A' }}</td>
                <td>
                    @if(isset($measure->status))
                        @if($measure->status === 'pending')
                            U toku
                        @elseif($measure->status === 'in_progress')
                            U radu
                        @elseif($measure->status === 'completed')
                            Završeno
                        @elseif($measure->status === 'cancelled')
                            Otkazano
                        @else
                            {{ $measure->status }}
                        @endif
                    @else
                        -
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    <h2>7. POTPISI</h2>
    <div style="width: 100%; overflow: hidden;">
        <div class="signature-box" style="float: left; width: 48%; margin-right: 2%;">
            <strong>Potpis kontrolora:</strong><br>
            @php
                $controllerSignature = collect($signatures)->firstWhere('signature_type', 'controller');
            @endphp
            @if($controllerSignature)
                <div style="margin-top: 10px;">
                    {{ $controllerSignature->user_name ?? 'N/A' }}<br>
                    <span style="color: #666; font-size: 8pt;">
                        {{ $controllerSignature->signed_at ? \Carbon\Carbon::parse($controllerSignature->signed_at)->format('d.m.Y H:i') : 'N/A' }}
                    </span>
                </div>
            @else
                <div style="margin-top: 10px; color: #999;">Nije potpisano</div>
            @endif
        </div>
        <div class="signature-box" style="float: left; width: 48%;">
            <strong>Potpis poslovođe prodavnice:</strong><br>
            @php
                $storeManagerSignature = collect($signatures)->firstWhere('signature_type', 'store_manager');
            @endphp
            @if($storeManagerSignature)
                <div style="margin-top: 10px;">
                    {{ $storeManagerSignature->user_name ?? 'N/A' }}<br>
                    <span style="color: #666; font-size: 8pt;">
                        {{ $storeManagerSignature->signed_at ? \Carbon\Carbon::parse($storeManagerSignature->signed_at)->format('d.m.Y H:i') : 'N/A' }}
                    </span>
                </div>
            @else
                <div style="margin-top: 10px; color: #999;">Nije potpisano</div>
            @endif
        </div>
    </div>

    <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; font-size: 8pt; color: #666;">
        <p>Generisano: {{ \Carbon\Carbon::now()->format('d.m.Y H:i:s') }}</p>
        <p>PlanTim - Sistem za upravljanje kontrolama i obilascima</p>
    </div>
</body>
</html>

