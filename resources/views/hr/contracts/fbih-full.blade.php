<!DOCTYPE html>
<html lang="bs">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; line-height: 1.45; color: #111; }
        .title { text-align: center; font-weight: bold; font-size: 14px; margin: 14px 0 8px; letter-spacing: 2px; }
        .center { text-align: center; }
        .clause { margin-top: 10px; text-align: justify; }
        .clause strong { display: inline; }
        .muted { margin-top: 6px; }
        .signature { margin-top: 32px; width: 100%; }
        .signature td { width: 50%; text-align: center; vertical-align: top; }
    </style>
</head>
<body>
    @php
        $v = $values ?? [];
        $origin = trim((string) ($v['employee_origin'] ?? ''));
        $address = trim((string) ($v['employee_address'] ?? ''));
        $education = trim((string) ($v['employee_education'] ?? ''));
        $storeName = trim((string) ($v['store_name'] ?? ''));
        $storeCity = trim((string) ($v['store_city'] ?? ''));
        $workEnd = trim((string) ($v['work_end_date'] ?? ''));
        $salaryNet = trim((string) ($v['salary_net'] ?? ''));
        $employeeLine = trim((string) ($v['employee_full_name'] ?? ''));
        if ($origin !== '') {
            $employeeLine .= ', ' . $origin;
        }
        if ($address !== '') {
            $employeeLine .= ', ' . $address;
        }
        if ($education !== '') {
            $employeeLine .= ', ' . $education;
        }
        $placement = trim((string) ($v['position_title'] ?? ''));
        if ($storeName !== '') {
            $placement .= ', u prodavnici ' . $storeName;
        }
        if ($storeCity !== '') {
            $placement .= ' u ' . $storeCity;
        }
        $termExtra = $workEnd !== '' ? (', a ugovor važi do ' . $workEnd) : '';
        $netExtra = ($salaryNet !== '' && $salaryNet !== '0,00')
            ? (' Neto plata iznosi ' . $salaryNet . ' KM.')
            : '';
    @endphp

    <p>Na osnovu člana Zakona o radu ("Službene novine F BiH", broj 26/16), odredaba Općeg kolektivnog ugovora za teritoriju Federacije Bosne i Hercegovine ("Službene novine FBiH", broj 48/16), i Pravilnika o radu Društva, dana {{ $v['contract_sign_date'] ?? '' }} u Sarajevu, zaključuje se:</p>

    <div class="title">U G O V O R &nbsp; O &nbsp; R A D U</div>
    <p class="center">Kojim se uređuju prava i obaveze na rad i po osnovu rada, zaključen u Sarajevu, dana {{ $v['contract_sign_date'] ?? '' }}</p>
    <p>između,</p>
    <p>1. „PLANIKA FLEX“ d.o.o. Sarajevo, ul. Hajrudina Šabanije br. 39 (u daljem tekstu: Poslodavac), kojeg zastupa direktor Elvir Hurić,</p>
    <p>i</p>
    <p>2. {{ $employeeLine }} (u daljem tekstu: Radnik).</p>

    <div class="clause"><strong>Član 1.</strong> Ovim ugovorom Poslodavac i Radnik uređuju međusobna prava i obaveze iz radnog odnosa, u skladu sa Zakonom o radu, Pravilnikom o radu, Kolektivnim ugovorom i drugim općim i pojedinačnim aktima poslodavca.</div>

    <div class="clause"><strong>Član 2.</strong> Ugovor se zaključuje {{ $v['employment_term_text'] ?? '' }}. Početak rada po ovom ugovoru je {{ $v['work_start_date'] ?? '' }}{{ $termExtra }}.</div>

    <div class="clause"><strong>Član 3.</strong> Radnik se raspoređuje na radno mjesto {{ $placement }}. Ugovorne strane izričito ugovaraju da se zbog potreba posla mjestom rada mogu smatrati i druge poslovne jedinice Poslodavca u BiH, a ukoliko se ukaže potreba za promjenom radnog mjesta, nije potrebno zaključivati aneks ugovora o radu.</div>

    <div class="clause"><strong>Član 4.</strong> Radnik se obavezuje da će poslove iz člana 3. ovog ugovora obavljati stručno, kvalitetno i blagovremeno, na način i pod uslovima utvrđenim u Pravilniku o radu, a naročito u skladu sa opisom radnog mjesta {{ $v['position_title'] ?? '' }}. Obavlja i druge poslove po nalogu neposrednog rukovodioca i direktora društva, a za svoj rad odgovara neposrednom rukovodiocu i direktoru društva.</div>

    <div class="clause"><strong>Član 5.</strong> Za obavljanje poslova iz člana 3. ovog ugovora Radniku se određuje plata prije oporezivanja u iznosu {{ $v['salary_gross'] ?? '' }} KM.{{ $netExtra }} Osnovna plaća radnika se uvećava za zakonom propisane dodatke na plaću a prema Pravilniku o radu. Plata iz stava 1. ovog člana se može uvećati ili umanjiti za 30% u zavisnosti od rezultata rada, a ne može biti manja od minimalne zakonom predviđene plaće. Plata će se isplaćivati najkasnije do kraja tekućeg mjeseca za prethodni mjesec.</div>

    <div class="clause"><strong>Član 6.</strong> Radnik ima pravo na naknadu plaće za vrijeme korištenja godišnjeg odmora i privremene nesposobnosti za rad („bolovanje“). Radniku će se isplatiti naknada za ishranu u toku rada („topli obrok“) u skladu sa Zakonom, Kolektivnim ugovorom i općim aktom Poslodavca.</div>

    <div class="clause"><strong>Član 7.</strong> Poslodavac se obavezuje da plaću i naknade iz člana 5. i 6. ovog ugovora isplaćuje mjesečno, prema njegovoj likvidnosti, a najkasnije do kraja narednog mjeseca. Prilikom isplate plaće Poslodavac se obavezuje Radniku uručiti pisani obračun plaće. Pojedinačno obračunata i isplaćena plaća predstavlja poslovnu tajnu Poslodavca.</div>

    <div class="clause"><strong>Član 8.</strong> Radno vrijeme radnika iznosi 40 sati sedmično i raspoređuje se u šestodnevnoj radnoj sedmici, sa rasporedom rada u smjenama, koje su organizovane prema Pravilniku o radu.</div>

    <div class="clause"><strong>Član 9.</strong> Radnik ima pravo na dnevni i sedmični odmor u skladu sa Zakonom, Kolektivnim ugovorom i općim aktom Poslodavca. Radnik koji radi sa punim radnim vremenom ima pravo na odmor u toku radnog dana u trajanju od 30 minuta. Ovo vrijeme se ne uračunava u radno vrijeme.</div>

    <div class="clause"><strong>Član 10.</strong> Pravo na odmore, odsustva, zaštitu na radu, zaštitu prava iz radnog odnosa i sva druga prava i obaveze po osnovu rada, koja nisu posebno uređena ovim ugovorom, ostvaruju se u skladu sa odredbama Zakona o radu, Pravilnikom o radu, Kolektivnim ugovorom i drugim opštim aktima poslodavca, sa kojima je radnik upoznat prilikom zaključivanja ovog ugovora.</div>

    <div class="clause"><strong>Član 11.</strong> Ugovorne strane zadržavaju pravo izmjene ovog ugovora na način utvrđen Zakonom o radu, Kolektivnim ugovorom i Pravilnikom o radu.</div>

    <div class="clause"><strong>Član 12.</strong> Ovaj ugovor može prestati na način i pod uslovima utvrđenim Pravilnikom o radu, u skladu sa zakonom.</div>

    <div class="clause"><strong>Član 13.</strong> Svi drugi uslovi i odnosi koji nisu uređeni ovim ugovorom ostvaruju se u skladu sa Zakonom o radu, Pravilnikom o radu, Kolektivnim ugovorom i drugim općim i pojedinačnim aktima poslodavca.</div>

    <div class="clause"><strong>Član 14.</strong> Sve eventualne sporove iz ovog ugovora ugovorne strane će rješavati sporazumno, a ukoliko to nije moguće, spor će se rješavati pred nadležnim sudom u Sarajevu.</div>

    <div class="clause"><strong>Član 15.</strong> Ovaj ugovor se smatra zaključenim kada ga potpišu obje ugovorne strane, a primjenjuje se od {{ $v['effective_date'] ?? '' }}. Potpisom ovog ugovora prestaje da važi prethodno potpisani ugovor kao i sve njegove odredbe.</div>

    <div class="clause"><strong>Član 16.</strong> Ovaj ugovor je sačinjen u 3 (tri) istovjetna primjerka od kojih 1 (jedan) zadržava Radnik, a 2 (dva) Poslodavac.</div>

    <div class="clause muted"><strong>Ugovor broj:</strong> {{ $v['contract_number'] ?? '' }}</div>

    <table class="signature">
        <tr>
            <td>RADNIK<br><br>______________________<br>{{ $v['employee_signature_name'] ?? '' }}</td>
            <td>POSLODAVAC<br><br>______________________<br>DIREKTOR<br>HURIĆ ELVIR</td>
        </tr>
    </table>
</body>
</html>
