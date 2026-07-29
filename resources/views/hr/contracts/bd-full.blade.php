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
    <p>Na osnovu članova 10. i 12. Zakona o radu Brčko distrikta BiH te članova 6., 7. i 8. Pravilnika o radu Planika Flex d.o.o zaključuje se sljedeće:</p>

    <div class="title">U G O V O R O R A D U</div>
    <p class="center">Kojim se uređuju prava i obaveze na rad i po osnovu rada, zaključen u Sarajevu, dana {{ $values['contract_sign_date'] }}</p>
    <p>1. „PLANIKA FLEX“ d.o.o Sarajevo ul. Hajrudina Šabanije br.39 (Poslodavac), kojeg zastupa direktor Elvir Hurić,</p>
    <p>2. {{ $values['employee_full_name'] }}, {{ $values['employee_origin'] }} {{ $values['employee_address'] }}, {{ $values['employee_education'] }} (Radnik)</p>

    <div class="clause"><strong>Član 2.</strong> Ugovor se zaključuje {{ $values['employment_term_text'] }}. Početak rada po ovom ugovoru je {{ $values['work_start_date'] }} @if(!empty($values['work_end_date'])) , a ugovor važi do {{ $values['work_end_date'] }} @endif.</div>
    <div class="clause"><strong>Član 3.</strong> Radnik se raspoređuje na radno mjesto {{ $values['position_title'] }}, u prodavnici {{ $values['store_name'] }} u {{ $values['store_city'] }}.</div>
    <div class="clause"><strong>Član 5.</strong> Plata prije oporezivanja iznosi {{ $values['salary_gross'] }} KM.</div>
    <div class="clause"><strong>Član 15.</strong> Ugovor se primjenjuje od {{ $values['effective_date'] }}.</div>
    <div class="clause"><strong>Ugovor broj:</strong> {{ $values['contract_number'] }}</div>

    <table class="signature">
        <tr>
            <td>RADNIK<br><br>______________________<br>{{ $values['employee_signature_name'] }}</td>
            <td>POSLODAVAC<br><br>______________________<br>DIREKTOR<br>HURIĆ ELVIR</td>
        </tr>
    </table>
</body>
</html>
