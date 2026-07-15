<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Izvještaj evaluacije - {{ $evaluation->id }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1a1a1a;
        }
        .info-section {
            margin-bottom: 25px;
        }
        .info-section h2 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #1a1a1a;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .info-row {
            display: flex;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: bold;
            width: 200px;
        }
        .info-value {
            flex: 1;
        }
        .scores-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .scores-table th,
        .scores-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .scores-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .rating-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin-top: 5px;
        }
        .rating-odlican {
            background-color: #10b981;
            color: white;
        }
        .rating-dobar {
            background-color: #3b82f6;
            color: white;
        }
        .rating-zadovoljavajuci {
            background-color: #f59e0b;
            color: white;
        }
        .rating-treba-poboljsanje {
            background-color: #ef4444;
            color: white;
        }
        .score-cell {
            font-weight: bold;
            text-align: center;
        }
        .score-excellent {
            background-color: #d1fae5;
            color: #065f46;
        }
        .score-good {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .score-satisfactory {
            background-color: #fef3c7;
            color: #92400e;
        }
        .score-needs-improvement {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .signatures-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signatures-grid {
            display: flex;
            justify-content: space-around;
            margin-top: 20px;
        }
        .signature-box {
            width: 45%;
            border: 1px solid #ddd;
            padding: 15px;
            text-align: center;
        }
        .signature-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
        }
        .signature-image {
            max-width: 100%;
            max-height: 100px;
            margin: 10px 0;
        }
        .signature-info {
            margin-top: 10px;
            font-size: 10px;
            color: #666;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Izvještaj evaluacije zaposlenika</h1>
        @php
            $rating = strtolower($evaluation->rating ?? '');
            $ratingClass = 'rating-' . str_replace(' ', '-', $rating);
        @endphp
        <div style="margin-top: 15px;">
            <span class="rating-badge {{ $ratingClass }}" style="font-size: 16px; padding: 8px 20px;">
                Kategorija: {{ ucfirst($evaluation->rating ?? 'N/A') }}
            </span>
        </div>
    </div>

    <div class="info-section">
        <h2>Osnovni podaci</h2>
        <div class="info-row">
            <div class="info-label">Zaposleni:</div>
            <div class="info-value">{{ $employee->name ?? 'N/A' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Prodavnica:</div>
            <div class="info-value">{{ $evaluation->store->name ?? 'N/A' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Datum evaluacije:</div>
            <div class="info-value">{{ \Carbon\Carbon::parse($evaluation->evaluation_date)->format('d.m.Y') }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Period:</div>
            <div class="info-value">
                {{ \Carbon\Carbon::parse($evaluation->period_start)->format('d.m.Y') }} - 
                {{ \Carbon\Carbon::parse($evaluation->period_end)->format('d.m.Y') }}
            </div>
        </div>
        <div class="info-row">
            <div class="info-label">Ocjenjivač:</div>
            <div class="info-value">{{ $evaluation->evaluator->name ?? 'N/A' }}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Prosječna ocjena:</div>
            <div class="info-value">
                <strong>{{ number_format($evaluation->average_score ?? 0, 2) }} / 5.00</strong>
            </div>
        </div>
        <div class="info-row">
            <div class="info-label">Kategorija ocjene:</div>
            <div class="info-value">
                @php
                    $rating = strtolower($evaluation->rating ?? '');
                    $ratingClass = 'rating-' . str_replace(' ', '-', $rating);
                @endphp
                <span class="rating-badge {{ $ratingClass }}">
                    {{ ucfirst($evaluation->rating ?? 'N/A') }}
                </span>
            </div>
        </div>
    </div>

    @if(isset($evaluation->scores) && is_array($evaluation->scores))
    <div class="info-section">
        <h2>Detaljne ocjene po kriterijima</h2>
        <table class="scores-table">
            <thead>
                <tr>
                    <th>Kriterij</th>
                    <th>Ocjena</th>
                    <th>Kategorija</th>
                </tr>
            </thead>
            <tbody>
                @foreach($evaluation->scores as $criterion => $score)
                @php
                    $scoreValue = (float)$score;
                    $scoreClass = '';
                    $category = '';
                    
                    if ($scoreValue >= 4.5) {
                        $scoreClass = 'score-excellent';
                        $category = 'Odličan';
                    } elseif ($scoreValue >= 3.5) {
                        $scoreClass = 'score-good';
                        $category = 'Dobar';
                    } elseif ($scoreValue >= 2.5) {
                        $scoreClass = 'score-satisfactory';
                        $category = 'Zadovoljavajući';
                    } else {
                        $scoreClass = 'score-needs-improvement';
                        $category = 'Treba poboljšanje';
                    }
                @endphp
                <tr>
                    <td>{{ $criterion }}</td>
                    <td class="score-cell {{ $scoreClass }}">{{ number_format($score, 2) }}</td>
                    <td class="{{ $scoreClass }}">{{ $category }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    @if($evaluation->overall_comment)
    <div class="info-section">
        <h2>Opći komentar</h2>
        <p>{{ $evaluation->overall_comment }}</p>
    </div>
    @endif

    @if(isset($evaluation->recommendations) && is_array($evaluation->recommendations) && count($evaluation->recommendations) > 0)
    <div class="info-section">
        <h2>Preporuke</h2>
        <ul>
            @foreach($evaluation->recommendations as $recommendation)
            <li>{{ $recommendation }}</li>
            @endforeach
        </ul>
    </div>
    @endif

    <div class="signatures-section">
        <h2>Digitalni potpis</h2>
        <div class="signatures-grid" style="justify-content: center;">
            @php
                // Debug: Log what we receive in the template
                \Log::info('PDF Template - Starting signature processing', [
                    'signatures_type' => gettype($signatures),
                    'signatures_count' => is_countable($signatures) ? count($signatures) : 'N/A',
                ]);
                
                // Convert to collection if it's an array
                $signaturesCollection = is_array($signatures) ? collect($signatures) : $signatures;
                $evaluatorSignature = $signaturesCollection->firstWhere('signature_type', 'evaluator');
                
                // Debug: Log evaluator signature
                \Log::info('PDF Template - Evaluator signature', [
                    'has_evaluator_signature' => !is_null($evaluatorSignature),
                    'signature_id' => $evaluatorSignature->id ?? null,
                    'signed_at' => $evaluatorSignature->signed_at ?? null,
                    'created_at' => $evaluatorSignature->created_at ?? null,
                    'has_signature_data' => isset($evaluatorSignature->signature_data) && !empty($evaluatorSignature->signature_data),
                    'has_signature_base64' => isset($evaluatorSignature->signature_base64) && !empty($evaluatorSignature->signature_base64),
                    'signature_data_length' => isset($evaluatorSignature->signature_data) ? strlen($evaluatorSignature->signature_data) : 0,
                    'signature_base64_length' => isset($evaluatorSignature->signature_base64) ? strlen($evaluatorSignature->signature_base64) : 0,
                ]);
                
                // Get signature status
                $signatureStatus = null;
                if (is_object($evaluation) && isset($evaluation->signature_status)) {
                    $signatureStatus = $evaluation->signature_status;
                } elseif (is_array($evaluation) && isset($evaluation['signature_status'])) {
                    $signatureStatus = $evaluation['signature_status'];
                }
                
                \Log::info('PDF Template - Signature status', [
                    'signature_status' => $signatureStatus,
                    'evaluation_type' => gettype($evaluation),
                ]);
                
                // Check if evaluator has signed
                $isSigned = false;
                $hasSignatureData = $evaluatorSignature && isset($evaluatorSignature->signature_data) && !empty(trim($evaluatorSignature->signature_data));
                
                // Check signature_status first (most reliable)
                if ($signatureStatus && in_array($signatureStatus, ['evaluator_signed', 'employee_signed', 'completed'])) {
                    $isSigned = true;
                } elseif ($hasSignatureData) {
                    // If no signature_status but we have signature data, consider it signed
                    $isSigned = true;
                }
                
                \Log::info('PDF Template - Signature check result', [
                    'isSigned' => $isSigned,
                    'hasSignatureData' => $hasSignatureData,
                    'signatureStatus' => $signatureStatus,
                ]);
                
                // Prepare signature image - use base64 directly for DomPDF
                $signatureImage = null;
                if ($hasSignatureData) {
                    // Prefer clean base64 data if available (from controller processing)
                    if (isset($evaluatorSignature->signature_base64) && !empty(trim($evaluatorSignature->signature_base64))) {
                        $base64Data = trim($evaluatorSignature->signature_base64);
                        $signatureImage = 'data:image/png;base64,' . $base64Data;
                        \Log::info('PDF Template - Using signature_base64', [
                            'base64_length' => strlen($base64Data),
                            'image_src_length' => strlen($signatureImage),
                        ]);
                    } else {
                        // Fallback to original signature_data
                        $signatureData = trim($evaluatorSignature->signature_data);
                        if (!empty($signatureData)) {
                            // Remove data URI prefix if present
                            if (strpos($signatureData, 'data:image/') === 0) {
                                // Extract base64 part
                                $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $signatureData);
                                $signatureImage = 'data:image/png;base64,' . $base64Data;
                                \Log::info('PDF Template - Extracted base64 from data URI', [
                                    'original_length' => strlen($signatureData),
                                    'base64_length' => strlen($base64Data),
                                ]);
                            } elseif (strpos($signatureData, 'data:') !== 0) {
                                // If it's just base64, add data URI prefix
                                $signatureImage = 'data:image/png;base64,' . $signatureData;
                                \Log::info('PDF Template - Added data URI prefix to base64', [
                                    'base64_length' => strlen($signatureData),
                                ]);
                            } else {
                                $signatureImage = $signatureData;
                                \Log::info('PDF Template - Using signature_data as-is', [
                                    'data_length' => strlen($signatureData),
                                ]);
                            }
                        } else {
                            \Log::warning('PDF Template - signature_data is empty after trim', []);
                        }
                    }
                } else {
                    \Log::warning('PDF Template - No signature data available', [
                        'has_evaluator_signature' => !is_null($evaluatorSignature),
                    ]);
                }
                
                \Log::info('PDF Template - Final signature image', [
                    'has_signature_image' => !is_null($signatureImage),
                    'image_src_length' => $signatureImage ? strlen($signatureImage) : 0,
                    'image_src_preview' => $signatureImage ? substr($signatureImage, 0, 50) . '...' : null,
                ]);
            @endphp

            <div class="signature-box" style="width: 50%;">
                <h3>Potpis ocjenjivača</h3>
                @if($isSigned)
                    @if($signatureImage)
                        @php
                            // For DomPDF, we need to ensure the image is properly formatted
                            // DomPDF works best with base64 data URIs
                            $finalImageSrc = $signatureImage;
                            
                            // If it's already a data URI, use it directly
                            if (strpos($signatureImage, 'data:') === 0) {
                                $finalImageSrc = $signatureImage;
                            } 
                            // If it's a file path, convert to base64
                            elseif (file_exists($signatureImage)) {
                                try {
                                    $imageData = file_get_contents($signatureImage);
                                    if ($imageData !== false) {
                                        $base64 = base64_encode($imageData);
                                        $finalImageSrc = 'data:image/png;base64,' . $base64;
                                    }
                                } catch (\Exception $e) {
                                    // File read failed, try to use original
                                }
                            }
                        @endphp
                        @if(strpos($finalImageSrc, 'data:') === 0)
                            {{-- Use base64 data URI for DomPDF --}}
                            <img src="{{ $finalImageSrc }}" alt="Potpis ocjenjivača" class="signature-image" style="max-width: 100%; max-height: 100px; object-fit: contain; margin: 10px 0; display: block; border: 1px solid #ddd;" />
                        @else
                            {{-- Fallback to file path --}}
                            <img src="{{ $finalImageSrc }}" alt="Potpis ocjenjivača" class="signature-image" style="max-width: 100%; max-height: 100px; object-fit: contain; margin: 10px 0; display: block; border: 1px solid #ddd;" />
                        @endif
                    @elseif($hasSignatureData)
                        {{-- Signature data exists but image couldn't be processed --}}
                        <p style="color: #999; font-size: 10px;">Slika potpisa nije dostupna (signature_data postoji ali nije obrađen)</p>
                    @else
                        {{-- No signature data at all --}}
                        <p style="color: #999; font-size: 10px;">Slika potpisa nije dostupna</p>
                    @endif
                    <div class="signature-info">
                        <p><strong>{{ $evaluatorSignature->user_name ?? ($evaluation->evaluator->name ?? ($evaluation->evaluator_name ?? 'N/A')) }}</strong></p>
                        @php
                            $signatureDate = null;
                            if ($evaluatorSignature) {
                                // Try signed_at first
                                if (isset($evaluatorSignature->signed_at) && !empty($evaluatorSignature->signed_at)) {
                                    try {
                                        $signatureDate = \Carbon\Carbon::parse($evaluatorSignature->signed_at);
                                    } catch (\Exception $e) {
                                        // If parsing fails, try created_at
                                        if (isset($evaluatorSignature->created_at) && !empty($evaluatorSignature->created_at)) {
                                            try {
                                                $signatureDate = \Carbon\Carbon::parse($evaluatorSignature->created_at);
                                            } catch (\Exception $e2) {
                                                // Both failed, use null
                                            }
                                        }
                                    }
                                } 
                                // Fallback to created_at if signed_at is not available
                                elseif (isset($evaluatorSignature->created_at) && !empty($evaluatorSignature->created_at)) {
                                    try {
                                        $signatureDate = \Carbon\Carbon::parse($evaluatorSignature->created_at);
                                    } catch (\Exception $e) {
                                        // Parsing failed
                                    }
                                }
                            }
                            
                            // If no date from signature but status is signed, use evaluation updated_at
                            if (!$signatureDate && $signatureStatus && in_array($signatureStatus, ['evaluator_signed', 'completed'])) {
                                if (isset($evaluation->updated_at) && !empty($evaluation->updated_at)) {
                                    try {
                                        $signatureDate = \Carbon\Carbon::parse($evaluation->updated_at);
                                    } catch (\Exception $e) {
                                        // Parsing failed, try created_at
                                        if (isset($evaluation->created_at) && !empty($evaluation->created_at)) {
                                            try {
                                                $signatureDate = \Carbon\Carbon::parse($evaluation->created_at);
                                            } catch (\Exception $e2) {
                                                // Both failed
                                            }
                                        }
                                    }
                                } elseif (isset($evaluation->created_at) && !empty($evaluation->created_at)) {
                                    try {
                                        $signatureDate = \Carbon\Carbon::parse($evaluation->created_at);
                                    } catch (\Exception $e) {
                                        // Parsing failed
                                    }
                                }
                            }
                        @endphp
                        @if($signatureDate)
                            <p>Potpisano: {{ $signatureDate->format('d.m.Y H:i') }}</p>
                        @elseif($signatureStatus && in_array($signatureStatus, ['evaluator_signed', 'completed']))
                            <p>Status: Potpisano</p>
                        @endif
                    </div>
                @else
                    <p style="color: #999;">Nije potpisano</p>
                    @if($signatureStatus)
                        <p style="color: #999; font-size: 10px;">Status: {{ $signatureStatus }}</p>
                    @endif
                @endif
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Generisano: {{ now()->format('d.m.Y H:i:s') }}</p>
    </div>
</body>
</html>


