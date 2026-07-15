<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset lozinke - PlanTim</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #3b82f6;
            margin: 0;
        }
        .content {
            background-color: #fff;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #3b82f6;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #2563eb;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 20px;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PlanTim</h1>
        </div>
        
        <div class="content">
            <p>Poštovani/a {{ $user->name }},</p>
            
            <p>Primili smo zahtjev za reset lozinke za vaš nalog.</p>
            
            <p>Kliknite na dugme ispod da resetujete lozinku:</p>
            
            <div style="text-align: center;">
                <a href="{{ $resetUrl }}" class="button">Resetuj lozinku</a>
            </div>
            
            <p>Ili kopirajte i zalijepite sljedeći link u vaš browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">{{ $resetUrl }}</p>
            
            <div class="warning">
                <strong>Važno:</strong> Ovaj link je validan samo 60 minuta. Ako niste zatražili reset lozinke, ignorišite ovaj email.
            </div>
        </div>
        
        <div class="footer">
            <p>Ovo je automatski generisan email. Molimo ne odgovarajte na ovaj email.</p>
            <p>&copy; {{ date('Y') }} PlanTim. Sva prava zadržana.</p>
        </div>
    </div>
</body>
</html>



