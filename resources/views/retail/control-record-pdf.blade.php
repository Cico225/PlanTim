<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Evidencija Kontrole - {{ $record->id ?? 'N/A' }}</title>
    <style>
        @page {
            margin: 15mm;
        }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .header h2 {
            font-size: 14px;
            font-weight: normal;
            color: #666;
        }
        .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 12px;
            font-weight: bold;
            background-color: #f0f0f0;
            padding: 5px 10px;
            margin-bottom: 8px;
            border-left: 3px solid #333;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 10px;
        }
        .info-row {
            margin-bottom: 8px;
            padding: 5px 0;
            width: 100%;
            border-bottom: 1px solid #eee;
        }
        .info-label {
            display: inline-block;
            width: 40%;
            font-weight: bold;
            padding: 3px 5px;
            vertical-align: top;
        }
        .info-value {
            display: inline-block;
            width: 59%;
            padding: 3px 5px;
            vertical-align: top;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 9px;
        }
        table th {
            background-color: #333;
            color: white;
            padding: 5px;
            text-align: left;
            font-weight: bold;
        }
        table td {
            padding: 4px;
            border: 1px solid #ddd;
        }
        table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .signature-box {
            border: 1px solid #333;
            padding: 10px;
            margin-top: 15px;
            min-height: 80px;
        }
        .signature-row {
            width: 100%;
            margin-bottom: 10px;
        }
        .signature-col {
            display: inline-block;
            width: 48%;
            padding: 5px;
            margin-right: 2%;
            vertical-align: top;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        .status-finalized {
            background-color: #d4edda;
            color: #155724;
        }
        .status-locked {
            background-color: #f8d7da;
            color: #721c24;
        }
        .text-muted {
            color: #666;
            font-size: 9px;
        }
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 8px;
            color: #666;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>EVIDENCIJA KONTROLE I OBILASKA</h1>
        <h2>ID: {{ $record->id ?? 'N/A' }} | Status: 
            @if(isset($record->status) && $record->status === 'finalized')
                <span class="status-badge status-finalized">FINALIZOVANO</span>
            @elseif(isset($record->status) && $record->status === 'locked')
                <span class="status-badge status-locked">ZAKLJUČANO</span>
            @else
                <span>DRAFT</span>
            @endif
        </h2>
    </div>

    <!-- Osnovni podaci -->
    <div class="section">
        <div class="section-title">1. OSNOVNI PODACI</div>
        <table style="width: 100%; border: none;">
            <tr>
                <td style="width: 40%; font-weight: bold; padding: 3px 5px; border: none;">Prodavnica:</td>
                <td style="width: 60%; padding: 3px 5px; border: none;">{{ $store->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Šifra prodavnice:</td>
                <td style="padding: 3px 5px; border: none;">{{ $store->code ?? $record->store_code ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Lokacija:</td>
                <td style="padding: 3px 5px; border: none;">{{ ($store->city ?? '') . ', ' . ($store->address ?? '') }}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Tip kontrole:</td>
                <td style="padding: 3px 5px; border: none;">
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
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Datum kontrole:</td>
                <td style="padding: 3px 5px; border: none;">
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
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Vrijeme:</td>
                <td style="padding: 3px 5px; border: none;">
                    @if(isset($record->start_time) && $record->start_time) {{ $record->start_time }} @endif
                    @if(isset($record->start_time) && $record->start_time && isset($record->end_time) && $record->end_time) - @endif
                    @if(isset($record->end_time) && $record->end_time) {{ $record->end_time }} @endif
                </td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Učesnici -->
    @if($participants->count() > 0)
    <div class="section">
        <div class="section-title">2. UČESNICI KONTROLE</div>
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
                    <td>{{ $participant->user_name ?? $participant->name }}</td>
                    <td>{{ $participant->function }}</td>
                    <td>{{ $participant->user_email ?? 'N/A' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <!-- Prisutne osobe -->
    @if($presentPersons->count() > 0)
    <div class="section">
        <div class="section-title">3. PRISUTNE OSOBE U PRODAVNICI</div>
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
                    <td>{{ $person->employee_name ?? $person->name }}</td>
                    <td>{{ $person->function }}</td>
                    <td>{{ $person->employee_email ?? 'N/A' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <!-- Totalna inventura -->
    @if($record->control_type === 'total_inventory')
    <div class="section">
        <div class="section-title">4. TOTALNA INVENTURA</div>
        
        @if($record->total_book_value || $record->total_counted_value)
        <table style="width: 100%; border: none;">
            <tr>
                <td style="width: 40%; font-weight: bold; padding: 3px 5px; border: none;">Ukupna knjigovodstvena vrijednost:</td>
                <td style="width: 60%; padding: 3px 5px; border: none;">{{ number_format($record->total_book_value ?? 0, 2, ',', '.') }} KM</td>
            </tr>
            <tr>
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Ukupna popisana vrijednost:</td>
                <td style="padding: 3px 5px; border: none;">{{ number_format($record->total_counted_value ?? 0, 2, ',', '.') }} KM</td>
            </tr>
            <tr>
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Razlika ukupno:</td>
                <td style="padding: 3px 5px; border: none;">{{ number_format($record->total_difference ?? 0, 2, ',', '.') }} KM</td>
            </tr>
            <tr>
                <td style="font-weight: bold; padding: 3px 5px; border: none;">Status inventure:</td>
                <td style="padding: 3px 5px; border: none;">
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

        @if($inventoryItems->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Artikal</th>
                    <th>Šifra</th>
                    <th>Knjigovodstveno</th>
                    <th>Popisano</th>
                    <th>Razlika</th>
                    <th>Vrijednost razlike</th>
                    <th>Napomena</th>
                </tr>
            </thead>
            <tbody>
                @foreach($inventoryItems as $item)
                <tr>
                    <td>{{ $item->article_name }}</td>
                    <td>{{ $item->article_code }}</td>
                    <td>{{ number_format($item->book_value ?? 0, 2, ',', '.') }}</td>
                    <td>{{ number_format($item->counted_value ?? 0, 2, ',', '.') }}</td>
                    <td>{{ number_format($item->difference ?? 0, 2, ',', '.') }}</td>
                    <td>{{ number_format($item->difference_value ?? 0, 2, ',', '.') }} KM</td>
                    <td>{{ $item->notes ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        @if($record->deviation_reasons)
        <div style="margin-top: 10px;">
            <div class="info-label">Razlozi odstupanja:</div>
            <div style="margin-left: 5px;">
                @if(is_string($record->deviation_reasons))
                    {{ $record->deviation_reasons }}
                @elseif(is_array(json_decode($record->deviation_reasons, true)))
                    {{ implode(', ', json_decode($record->deviation_reasons, true)) }}
                @else
                    {{ $record->deviation_reasons }}
                @endif
            </div>
        </div>
        @endif

        @if($record->inventory_conclusion)
        <div style="margin-top: 10px;">
            <div class="info-label">Zaključak inventure:</div>
            <div style="margin-left: 5px; white-space: pre-wrap;">{{ $record->inventory_conclusion }}</div>
        </div>
        @endif
    </div>
    @endif

    <!-- Obilazak i zapažanja -->
    @if($record->control_type === 'inspection')
    <div class="section">
        <div class="section-title">5. OBILAZAK I ZAPAŽANJA</div>
        
        @if($record->store_rating)
        <table style="width: 100%; border: none;">
            <tr>
                <td style="width: 40%; font-weight: bold; padding: 3px 5px; border: none;">Opšta ocjena prodavnice:</td>
                <td style="width: 60%; padding: 3px 5px; border: none;">{{ $record->store_rating }}/5</td>
            </tr>
        </table>
        @endif

        @if($record->store_rating_comment)
        <div style="margin-bottom: 10px;">
            <div class="info-label">Komentar ocjene:</div>
            <div style="margin-left: 5px; white-space: pre-wrap;">{{ $record->store_rating_comment }}</div>
        </div>
        @endif

        @if($observations->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Kategorija</th>
                    <th>Stavka</th>
                    <th>Status</th>
                    <th>Napomena</th>
                </tr>
            </thead>
            <tbody>
                @foreach($observations as $obs)
                <tr>
                    <td>{{ $obs->category ?? '-' }}</td>
                    <td>{{ $obs->item ?? '-' }}</td>
                    <td>
                        @if(isset($obs->status) && $obs->status === 'ok')
                            OK
                        @elseif(isset($obs->status) && $obs->status === 'not_ok')
                            Nije OK
                        @elseif(isset($obs->status) && $obs->status === 'n_a')
                            N/A
                        @else
                            -
                        @endif
                    </td>
                    <td>{{ $obs->note ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        @if($record->positive_observations)
        <div style="margin-top: 10px;">
            <div class="info-label">Pozitivna zapažanja:</div>
            <div style="margin-left: 5px; white-space: pre-wrap;">{{ $record->positive_observations }}</div>
        </div>
        @endif

        @if($record->negative_observations)
        <div style="margin-top: 10px;">
            <div class="info-label">Negativna zapažanja:</div>
            <div style="margin-left: 5px; white-space: pre-wrap;">{{ $record->negative_observations }}</div>
        </div>
        @endif

        @if($record->corrective_measures_proposed)
        <div style="margin-top: 10px;">
            <div class="info-label">Predložene korektivne mjere:</div>
            <div style="margin-left: 5px; white-space: pre-wrap;">{{ $record->corrective_measures_proposed }}</div>
        </div>
        @endif
    </div>
    @endif

    <!-- Naložene mjere -->
    @if($measures->count() > 0)
    <div class="section">
        <div class="section-title">6. NALOŽENE MJERE</div>
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
    </div>
    @endif

    <!-- Prilozi (slike) -->
    @if(isset($attachments) && $attachments->count() > 0)
    @php
        $imageAttachments = $attachments->filter(function($att) {
            return $att->file_type === 'image' || 
                   (isset($att->mime_type) && str_starts_with($att->mime_type, 'image/')) ||
                   preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $att->file_name);
        });
    @endphp
    @if($imageAttachments->count() > 0)
    <div class="section">
        <div class="section-title">7. PRILOZI (FOTOGRAFIJE)</div>
        <div style="margin-top: 10px;">
            @foreach($imageAttachments as $attachment)
                @if(isset($attachment->base64_data))
                <div style="margin-bottom: 15px; page-break-inside: avoid;">
                    <div style="margin-bottom: 5px; font-size: 9px; color: #666;">
                        <strong>{{ $attachment->file_name }}</strong>
                        @if(isset($attachment->file_size))
                            ({{ number_format($attachment->file_size / 1024, 2) }} KB)
                        @endif
                    </div>
                    <div style="border: 1px solid #ddd; padding: 5px; text-align: center; background-color: #f9f9f9;">
                        <img src="{{ $attachment->base64_data }}" 
                             alt="{{ $attachment->file_name }}" 
                             style="max-width: 50%; max-height: 150px; object-fit: contain;" />
                    </div>
                </div>
                @endif
            @endforeach
        </div>
    </div>
    @endif
    @endif

    <!-- Potpisi -->
    <div class="section">
        <div class="section-title">8. POTPISI</div>
        <div class="signature-row">
            <div class="signature-col">
                <div class="signature-box">
                    <strong>Potpis kontrolora:</strong><br>
                    @php
                        $controllerSignature = $signatures->where('signature_type', 'controller')->first();
                    @endphp
                    @if($controllerSignature && !empty($controllerSignature->user_name))
                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
                            <div style="font-size: 11pt; font-weight: bold; margin-bottom: 5px;">
                                {{ $controllerSignature->user_name }}
                            </div>
                            <div style="font-size: 9pt; color: #666; margin-bottom: 3px;">
                                <strong>Datum i vrijeme potpisa:</strong>
                            </div>
                            <div style="font-size: 9pt; color: #333;">
                                @if(!empty($controllerSignature->signed_at))
                                    @php
                                        try {
                                            $date = \Carbon\Carbon::parse($controllerSignature->signed_at);
                                            $formattedDate = $date->format('d.m.Y') . ' u ' . $date->format('H:i') . 'h';
                                        } catch (\Exception $e) {
                                            $formattedDate = $controllerSignature->signed_at;
                                        }
                                    @endphp
                                    {{ $formattedDate }}
                                @else
                                    N/A
                                @endif
                            </div>
                        </div>
                    @else
                        <div style="margin-top: 15px; padding-top: 10px; color: #999; font-style: italic;">
                            Nije potpisano
                        </div>
                    @endif
                </div>
            </div>
            <div class="signature-col">
                <div class="signature-box">
                    <strong>Potpis menadžera prodavnice:</strong><br>
                    @php
                        $storeManagerSignature = $signatures->where('signature_type', 'store_manager')->first();
                    @endphp
                    @if($storeManagerSignature && !empty($storeManagerSignature->user_name))
                        <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
                            <div style="font-size: 11pt; font-weight: bold; margin-bottom: 5px;">
                                {{ $storeManagerSignature->user_name }}
                            </div>
                            <div style="font-size: 9pt; color: #666; margin-bottom: 3px;">
                                <strong>Datum i vrijeme potpisa:</strong>
                            </div>
                            <div style="font-size: 9pt; color: #333;">
                                @if(!empty($storeManagerSignature->signed_at))
                                    @php
                                        try {
                                            $date = \Carbon\Carbon::parse($storeManagerSignature->signed_at);
                                            $formattedDate = $date->format('d.m.Y') . ' u ' . $date->format('H:i') . 'h';
                                        } catch (\Exception $e) {
                                            $formattedDate = $storeManagerSignature->signed_at;
                                        }
                                    @endphp
                                    {{ $formattedDate }}
                                @else
                                    N/A
                                @endif
                            </div>
                        </div>
                    @else
                        <div style="margin-top: 15px; padding-top: 10px; color: #999; font-style: italic;">
                            Nije potpisano
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Generisano: {{ \Carbon\Carbon::now()->format('d.m.Y H:i:s') }}</p>
        <p>PlanTim - Sistem za upravljanje kontrolama i obilascima</p>
    </div>
</body>
</html>
