<!DOCTYPE html>

<html>

<head>

    <meta charset="utf-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Kod za prijavu - PlanTim</title>

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

        .copy-hint {

            font-size: 12px;

            color: #6b7280;

            margin-top: 10px;

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



            <p>Primili smo zahtjev za prijavu na vaš nalog. Koristite sljedeći kod za završetak prijave:</p>



            <div style="text-align: center; margin: 24px 0 8px;">

                <input

                    type="text"

                    readonly

                    value="{{ $code }}"

                    style="display: inline-block; width: 220px; max-width: 100%; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px 12px; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #1e40af; background-color: #eff6ff; cursor: text;"

                />

                <p class="copy-hint">Dodirnite kod da ga označite, zatim kopirajte (Ctrl+C ili dugi pritisak)</p>

            </div>



            <p>Unesite kod na stranici za prijavu.</p>



            <div class="warning">

                <strong>Važno:</strong> Kod je validan samo 10 minuta. Ako niste vi zatražili prijavu, ignorišite ovaj email i promijenite lozinku.

            </div>

        </div>



        <div class="footer">

            <p>Ovo je automatski generisan email. Molimo ne odgovarajte na ovaj email.</p>

            <p>&copy; {{ date('Y') }} PlanTim. Sva prava zadržana.</p>

        </div>

    </div>

</body>

</html>

