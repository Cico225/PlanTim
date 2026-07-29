<!DOCTYPE html>
<html lang="bs">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.45; color: #111; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 12px 0; }
        .center { text-align: center; }
        .clause { margin-top: 10px; }
        .signature { margin-top: 28px; width: 100%; }
        .signature td { width: 50%; text-align: center; vertical-align: top; }
    </style>
</head>
<body>
    <p>Na osnovu člana Zakona o radu ("Službene novine F BiH", broj 26/16), odredaba Općeg kolektivnog ugovora za teritoriju Federacije Bosne i Hercegovine ("Službene novine FBiH", broj 48/16), i Pravilnika o radu Društva, dana {{ $values['contract_sign_date'] }} Sarajevu, zaključuje se:</p>

    <div class="title">U G O V O R O R A D U</div>
    <p class="center">Kojim se uređuju prava i obaveze na rad i po osnovu rada, zaključen u Sarajevu, dana {{ $values['contract_sign_date'] }}</p>
    <p>između,</p>
    <p>1. „PLANIKA FLEX“ d.o.o Sarajevo ul. Hajrudina Šabanije br.39 (u daljem tekstu: Poslodavac), kojeg zastupa direktor Elvir Hurić,</p>
    <p>i</p>
    <p>2. {{ $values['employee_full_name'] }}, {{ $values['employee_origin'] }} {{ $values['employee_address'] }}, {{ $values['employee_education'] }} (u daljem tekstu: Radnik)</p>

    <div class="clause"><strong>Član 2.</strong> Ugovor se zaključuje {{ $values['employment_term_text'] }}. Početak rada po ovom ugovoru je {{ $values['work_start_date'] }} @if(!empty($values['work_end_date'])) , a ugovor važi do {{ $values['work_end_date'] }} @endif.</div>
    <div class="clause"><strong>Član 3.</strong> Radnik se raspoređuje na radno mjesto {{ $values['position_title'] }}, u prodavnici {{ $values['store_name'] }} u {{ $values['store_city'] }}.</div>
    <div class="clause"><strong>Član 5.</strong> Za obavljenje poslova Radniku se određuje plata prije oporezivanja u iznosu {{ $values['salary_gross'] }} KM.</div>
    <div class="clause"><strong>Član 15.</strong> Ovaj ugovor se smatra zaključenim kada ga potpišu obje ugovorne strane, a primjenjuje se od {{ $values['effective_date'] }}.</div>
    <div class="clause"><strong>Ugovor broj:</strong> {{ $values['contract_number'] }}</div>

    <table class="signature">
        <tr>
            <td>RADNIK<br><br>______________________<br>{{ $values['employee_signature_name'] }}</td>
            <td>POSLODAVAC<br><br>______________________<br>DIREKTOR<br>HURIĆ ELVIR</td>
        </tr>
    </table>
</body>
</html>
