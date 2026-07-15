<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certifikat - {{ $certificate->certificate_number ?? '' }}</title>
    <style>
        @page {
            margin: 0;
            size: A4 portrait;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', sans-serif;
            background-color: #f5f5f5;
            width: 100%;
            height: 100%;
            padding: 20px;
            margin: 0;
        }
        
        .certificate-container {
            background-color: #ffffff;
            width: 100%;
            height: 100%;
            padding: 50px 60px;
            position: relative;
            border: 3px solid #2563eb;
            border-style: double;
            box-shadow: 0 0 0 2px #f59e0b;
        }
        
        /* Red decorative wave - top right */
        .deco-wave-top {
            position: absolute;
            top: 0;
            right: 0;
            width: 300px;
            height: 200px;
            background: radial-gradient(ellipse at top right, #dc2626, #991b1b, transparent 70%);
            opacity: 0.3;
            border-radius: 0 0 0 200px;
        }
        
        /* Red decorative wave - bottom left */
        .deco-wave-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 300px;
            height: 200px;
            background: radial-gradient(ellipse at bottom left, #dc2626, #991b1b, transparent 70%);
            opacity: 0.3;
            border-radius: 0 200px 0 0;
        }
        
        .content-wrapper {
            position: relative;
            z-index: 5;
            height: 100%;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-top: 20px;
        }
        
        .header h1 {
            font-size: 42px;
            color: #1e40af;
            margin-bottom: 5px;
            font-weight: bold;
            letter-spacing: 3px;
            text-transform: uppercase;
        }
        
        .header h2 {
            font-size: 28px;
            color: #1e40af;
            font-weight: normal;
            letter-spacing: 2px;
            text-transform: uppercase;
        }
        
        .presentation-text {
            text-align: center;
            font-size: 16px;
            color: #1e40af;
            margin: 30px 0;
            font-style: italic;
        }
        
        .recipient-name {
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            margin: 25px 0;
            font-family: 'DejaVu Sans', serif;
            text-decoration: underline;
            text-decoration-color: #3b82f6;
            text-decoration-thickness: 2px;
            padding-bottom: 10px;
        }
        
        .body-text {
            text-align: center;
            font-size: 14px;
            color: #1e40af;
            margin: 30px 0;
            line-height: 1.8;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .course-name {
            font-weight: bold;
            font-size: 18px;
        }
        
        .results-section {
            text-align: center;
            margin: 30px 0;
        }
        
        .results-container {
            display: inline-block;
            margin: 15px 0;
        }
        
        .result-item {
            display: inline-block;
            margin: 0 20px;
            vertical-align: top;
        }
        
        .result-label {
            font-size: 12px;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .result-value {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
        }
        
        .result-value.score {
            color: #059669;
        }
        
        .result-value.grade {
            color: #dc2626;
        }
        
        .footer-section {
            position: absolute;
            bottom: 80px;
            left: 50px;
            right: 50px;
            overflow: hidden;
        }
        
        .signature-left {
            float: left;
            width: 45%;
        }
        
        .signature-right {
            float: right;
            width: 45%;
        }
        
        .signature-label {
            font-size: 12px;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        
        .signature-line {
            border-top: 1px solid #3b82f6;
            width: 200px;
            margin-top: 40px;
        }
        
        /* Laurel wreath */
        .laurel-wreath {
            text-align: center;
            margin: 20px 0;
            position: relative;
            z-index: 10;
            height: 60px;
        }
        
        .laurel-wreath::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 60px;
            border: 3px solid #f59e0b;
            border-left: none;
            border-right: none;
            border-radius: 0;
        }
        
        .laurel-wreath::after {
            content: '★';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: 24px;
            color: #f59e0b;
        }
        
        .certificate-id {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            margin-top: 10px;
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
        }
        
        .stamp-section {
            text-align: center;
            margin-top: 20px;
        }
        
        .stamp {
            width: 100px;
            height: 100px;
            border: 5px solid #dc2626;
            border-radius: 50px;
            margin: 0 auto 10px;
            background-color: #ffffff;
            position: relative;
            display: inline-block;
        }
        
        .stamp::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 8px;
            right: 8px;
            bottom: 8px;
            border: 2px solid #dc2626;
            border-radius: 40px;
        }
        
        .stamp-text {
            font-size: 11px;
            font-weight: bold;
            color: #dc2626;
            text-align: center;
            line-height: 1.2;
            position: absolute;
            top: 50%;
            left: 50%;
            margin-left: -42%;
            margin-top: -16px;
            width: 84%;
            z-index: 10;
        }
        
        .stamp-inner-circle {
            position: absolute;
            top: 15px;
            left: 15px;
            right: 15px;
            bottom: 15px;
            border: 1px solid #dc2626;
            border-radius: 35px;
            background-color: rgba(220, 38, 38, 0.05);
        }
        
        .clear {
            clear: both;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        <div class="deco-wave-top"></div>
        <div class="deco-wave-bottom"></div>
        
        <div class="content-wrapper">
            <!-- Header -->
            <div class="header">
                <h1>CERTIFIKAT</h1>
                <h2>O ZAVRŠETKU KURSA</h2>
            </div>
            
            <!-- Presentation Text -->
            <div class="presentation-text">
                OVIM SE POTVRĐUJE DA JE
            </div>
            
            <!-- Recipient Name -->
            <div class="recipient-name">
                {{ $user->name ?? 'Korisnik' }}
            </div>
            
            <!-- Body Text -->
            <div class="body-text">
                uspješno završio/la kurs
                <span class="course-name">{{ $course->title ?? 'Kurs' }}</span>
                dana {{ isset($certificate->issued_at) ? date('d.m.Y', strtotime($certificate->issued_at)) : date('d.m.Y') }}.
            </div>
            
            <!-- Results -->
            @if(isset($certificate->final_score) || isset($certificate->grade))
                <div class="results-section">
                    <div class="results-container">
                        @if(isset($certificate->final_score))
                            <div class="result-item">
                                <div class="result-label">Rezultat</div>
                                <div class="result-value score">{{ number_format($certificate->final_score, 1) }}%</div>
                            </div>
                        @endif
                        
                        @if(isset($certificate->grade))
                            <div class="result-item">
                                <div class="result-label">Ocjena</div>
                                <div class="result-value grade">{{ $certificate->grade }}</div>
                            </div>
                        @endif
                    </div>
                </div>
            @endif
            
            <!-- Footer with Signature and Date -->
            <div class="footer-section">
                <div class="signature-left">
                    <div class="signature-label">Datum</div>
                    <div class="signature-line"></div>
                    <div style="margin-top: 5px; font-size: 11px; color: #64748b;">
                        {{ isset($certificate->issued_at) ? date('d.m.Y', strtotime($certificate->issued_at)) : date('d.m.Y') }}
                    </div>
                </div>
                
                <div class="signature-right">
                    <div class="signature-label">Potpis</div>
                    <div class="signature-line"></div>
                    <div class="stamp-section">
                        <div class="stamp">
                            <div class="stamp-inner-circle"></div>
                            <div class="stamp-text">
                                PLANIKA<br>
                                AKADEMIJA<br>
                                <span style="font-size: 9px;">PEČAT</span>
                            </div>
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 5px;">
                            Planika Akademija
                        </div>
                    </div>
                </div>
                <div class="clear"></div>
            </div>
            
            <!-- Laurel Wreath -->
            <div class="laurel-wreath"></div>
            
            <!-- Certificate ID -->
            @if(isset($certificate->certificate_number))
                <div class="certificate-id">
                    Certifikat #{{ $certificate->certificate_number }}
                </div>
            @endif
        </div>
    </div>
</body>
</html>
