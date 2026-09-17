<?php

namespace App\Services\HRM;

use ZipArchive;

/**
 * Builds a fillable DOCX employment-contract template that mirrors the Word layout
 * (Verdana 11pt, justified body, centered title, signature block).
 */
class FullContractDocxBuilder
{
    /**
     * @param  array<int, array{text: string, align?: string, bold?: bool, spaceAfter?: int}>  $paragraphs
     */
    public function build(string $outputPath, array $paragraphs): void
    {
        $dir = dirname($outputPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $documentXml = $this->documentXml($paragraphs);
        $files = [
            '[Content_Types].xml' => $this->contentTypesXml(),
            '_rels/.rels' => $this->relsXml(),
            'word/_rels/document.xml.rels' => $this->documentRelsXml(),
            'word/document.xml' => $documentXml,
            'word/styles.xml' => $this->stylesXml(),
        ];

        if (is_file($outputPath)) {
            @unlink($outputPath);
        }

        $zip = new ZipArchive();
        if ($zip->open($outputPath, ZipArchive::CREATE) !== true) {
            throw new \RuntimeException('Unable to create DOCX: ' . $outputPath);
        }

        foreach ($files as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();
    }

    /**
     * @return array<int, array{text: string, align?: string, bold?: bool, spaceAfter?: int}>
     */
    public function fbihParagraphs(): array
    {
        return [
            ['text' => 'Na osnovu člana Zakona o radu ("Službene novine F BiH", broj 26/16), odredaba Općeg kolektivnog ugovora za teritoriju Federacije Bosne i Hercegovine ("Službene novine FBiH", broj 48/16), i Pravilnika o radu Društva, dana ${contract_sign_date} u Sarajevu, zaključuje se:', 'align' => 'both'],
            ['text' => '', 'spaceAfter' => 0],
            ['text' => 'U G O V O R   O   R A D U', 'align' => 'center', 'bold' => true, 'spaceAfter' => 120],
            ['text' => 'Kojim se uređuju prava i obaveze na rad i po osnovu rada, zaključen u Sarajevu, dana ${contract_sign_date}', 'align' => 'center'],
            ['text' => 'između,', 'align' => 'both'],
            ['text' => '1. „PLANIKA FLEX“ d.o.o. Sarajevo, ul. Hajrudina Šabanije br. 39 (u daljem tekstu: Poslodavac), kojeg zastupa direktor Elvir Hurić,', 'align' => 'both'],
            ['text' => 'i', 'align' => 'both'],
            ['text' => '2. ${employee_details_line} (u daljem tekstu: Radnik).', 'align' => 'both'],
            ['text' => ''],
            ['text' => 'Član 1.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Ovim ugovorom Poslodavac i Radnik uređuju međusobna prava i obaveze iz radnog odnosa, u skladu sa Zakonom o radu, Pravilnikom o radu, Kolektivnim ugovorom i drugim općim i pojedinačnim aktima poslodavca.', 'align' => 'both'],
            ['text' => 'Član 2.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Ugovor se zaključuje ${employment_term_text}. Početak rada po ovom ugovoru je ${work_start_date}${work_end_clause}.', 'align' => 'both'],
            ['text' => 'Član 3.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Radnik se raspoređuje na radno mjesto ${position_title}, u prodavnici ${store_name} u ${store_city}. Ugovorne strane izričito ugovaraju da se zbog potreba posla mjestom rada mogu smatrati i druge poslovne jedinice Poslodavca u BiH, a ukoliko se ukaže potreba za promjenom radnog mjesta, nije potrebno zaključivati aneks ugovora o radu.', 'align' => 'both'],
            ['text' => 'Član 4.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Radnik se obavezuje da će poslove iz člana 3. ovog ugovora obavljati stručno, kvalitetno i blagovremeno, na način i pod uslovima utvrđenim u Pravilniku o radu, a naročito u skladu sa opisom radnog mjesta ${position_title}. Obavlja i druge poslove po nalogu neposrednog rukovodioca i direktora društva, a za svoj rad odgovara neposrednom rukovodiocu i direktoru društva.', 'align' => 'both'],
            ['text' => 'Član 5.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Za obavljanje poslova iz člana 3. ovog ugovora Radniku se određuje plata prije oporezivanja u iznosu ${salary_gross} KM. Osnovna plaća radnika se uvećava za zakonom propisane dodatke na plaću a prema Pravilniku o radu. Plata iz stava 1. ovog člana se može uvećati ili umanjiti za 30% u zavisnosti od rezultata rada, a ne može biti manja od minimalne zakonom predviđene plaće. Plata će se isplaćivati najkasnije do kraja tekućeg mjeseca za prethodni mjesec.', 'align' => 'both'],
            ['text' => 'Član 6.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Radnik ima pravo na naknadu plaće za vrijeme korištenja godišnjeg odmora i privremene nesposobnosti za rad („bolovanje“). Radniku će se isplatiti naknada za ishranu u toku rada („topli obrok“) u skladu sa Zakonom, Kolektivnim ugovorom i općim aktom Poslodavca.', 'align' => 'both'],
            ['text' => 'Član 7.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Poslodavac se obavezuje da plaću i naknade iz člana 5. i 6. ovog ugovora isplaćuje mjesečno, prema njegovoj likvidnosti, a najkasnije do kraja narednog mjeseca. Prilikom isplate plaće Poslodavac se obavezuje Radniku uručiti pisani obračun plaće. Pojedinačno obračunata i isplaćena plaća predstavlja poslovnu tajnu Poslodavca.', 'align' => 'both'],
            ['text' => 'Član 8.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Radno vrijeme radnika iznosi 40 sati sedmično i raspoređuje se u šestodnevnoj radnoj sedmici, sa rasporedom rada u smjenama, koje su organizovane prema Pravilniku o radu.', 'align' => 'both'],
            ['text' => 'Član 9.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Radnik ima pravo na dnevni i sedmični odmor u skladu sa Zakonom, Kolektivnim ugovorom i općim aktom Poslodavca. Radnik koji radi sa punim radnim vremenom ima pravo na odmor u toku radnog dana u trajanju od 30 minuta. Ovo vrijeme se ne uračunava u radno vrijeme.', 'align' => 'both'],
            ['text' => 'Član 10.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Pravo na odmore, odsustva, zaštitu na radu, zaštitu prava iz radnog odnosa i sva druga prava i obaveze po osnovu rada, koja nisu posebno uređena ovim ugovorom, ostvaruju se u skladu sa odredbama Zakona o radu, Pravilnikom o radu, Kolektivnim ugovorom i drugim opštim aktima poslodavca, sa kojima je radnik upoznat prilikom zaključivanja ovog ugovora.', 'align' => 'both'],
            ['text' => 'Član 11.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Ugovorne strane zadržavaju pravo izmjene ovog ugovora na način utvrđen Zakonom o radu, Kolektivnim ugovorom i Pravilnikom o radu.', 'align' => 'both'],
            ['text' => 'Član 12.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Ovaj ugovor može prestati na način i pod uslovima utvrđenim Pravilnikom o radu, u skladu sa zakonom.', 'align' => 'both'],
            ['text' => 'Član 13.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Svi drugi uslovi i odnosi koji nisu uređeni ovim ugovorom ostvaruju se u skladu sa Zakonom o radu, Pravilnikom o radu, Kolektivnim ugovorom i drugim općim i pojedinačnim aktima poslodavca.', 'align' => 'both'],
            ['text' => 'Član 14.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Sve eventualne sporove iz ovog ugovora ugovorne strane će rješavati sporazumno, a ukoliko to nije moguće, spor će se rješavati pred nadležnim sudom u Sarajevu.', 'align' => 'both'],
            ['text' => 'Član 15.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Ovaj ugovor se smatra zaključenim kada ga potpišu obje ugovorne strane, a primjenjuje se od ${effective_date}. Potpisom ovog ugovora prestaje da važi prethodno potpisani ugovor kao i sve njegove odredbe.', 'align' => 'both'],
            ['text' => 'Član 16.', 'align' => 'center', 'bold' => true, 'spaceAfter' => 60],
            ['text' => 'Ovaj ugovor je sačinjen u 3 (tri) istovjetna primjerka od kojih 1 (jedan) zadržava Radnik, a 2 (dva) Poslodavac.', 'align' => 'both'],
            ['text' => ''],
            ['text' => 'Ugovor broj: ${contract_number}', 'align' => 'both', 'bold' => true],
            ['text' => '', 'spaceAfter' => 240],
            ['text' => '        RADNIK                                                                     POSLODAVAC', 'align' => 'both', 'bold' => true],
            ['text' => ''],
            ['text' => '  ____________________                                                         __________________', 'align' => 'both'],
            ['text' => '        ${employee_signature_name}                                                                     DIREKTOR', 'align' => 'both'],
            ['text' => '                                                                                                    HURIĆ ELVIR', 'align' => 'both'],
        ];
    }

    /**
     * @return array<int, array{text: string, align?: string, bold?: bool, spaceAfter?: int}>
     */
    public function bdParagraphs(): array
    {
        $paragraphs = $this->fbihParagraphs();
        $paragraphs[0] = [
            'text' => 'Na osnovu članova 10. i 12. Zakona o radu Brčko distrikta BiH te članova 6., 7. i 8. Pravilnika o radu Planika Flex d.o.o. zaključuje se sljedeće:',
            'align' => 'both',
        ];
        // Replace FBiH-specific court reference in član 14
        foreach ($paragraphs as $i => $p) {
            if (($p['text'] ?? '') === 'Sve eventualne sporove iz ovog ugovora ugovorne strane će rješavati sporazumno, a ukoliko to nije moguće, spor će se rješavati pred nadležnim sudom u Sarajevu.') {
                $paragraphs[$i]['text'] = 'Sve eventualne sporove iz ovog ugovora ugovorne strane će rješavati sporazumno, a ukoliko to nije moguće, spor će se rješavati pred nadležnim sudom.';
            }
            if (str_starts_with($p['text'] ?? '', 'Pravo na odmore, odsustva')) {
                $paragraphs[$i]['text'] = 'Pravo na odmore, odsustva, zaštitu na radu, zaštitu prava iz radnog odnosa i sva druga prava i obaveze po osnovu rada, koja nisu posebno uređena ovim ugovorom, ostvaruju se u skladu sa Zakonom o radu Brčko distrikta BiH, Pravilnikom o radu i drugim aktima poslodavca.';
            }
            if (str_starts_with($p['text'] ?? '', 'Ovim ugovorom Poslodavac i Radnik')) {
                $paragraphs[$i]['text'] = 'Ovim ugovorom Poslodavac i Radnik uređuju međusobna prava i obaveze iz radnog odnosa, u skladu sa Zakonom o radu Brčko distrikta BiH, Pravilnikom o radu i drugim aktima poslodavca.';
            }
        }

        return $paragraphs;
    }

    /**
     * @param  array<int, array{text: string, align?: string, bold?: bool, spaceAfter?: int}>  $paragraphs
     */
    private function documentXml(array $paragraphs): string
    {
        $body = '';
        foreach ($paragraphs as $p) {
            $body .= $this->paragraphXml(
                $p['text'] ?? '',
                $p['align'] ?? 'both',
                (bool) ($p['bold'] ?? false),
                (int) ($p['spaceAfter'] ?? 120)
            );
        }

        $body .= '<w:sectPr>'
            . '<w:pgSz w:w="11906" w:h="16838"/>'
            . '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>'
            . '<w:cols w:space="708"/>'
            . '</w:sectPr>';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:body>' . $body . '</w:body></w:document>';
    }

    private function paragraphXml(string $text, string $align, bool $bold, int $spaceAfter): string
    {
        $jc = in_array($align, ['left', 'right', 'center', 'both'], true) ? $align : 'both';
        $escaped = htmlspecialchars($text, ENT_XML1 | ENT_COMPAT, 'UTF-8');
        $rPr = '<w:rPr>'
            . '<w:rFonts w:ascii="Verdana" w:hAnsi="Verdana" w:cs="Times New Roman"/>'
            . ($bold ? '<w:b/><w:bCs/>' : '')
            . '<w:sz w:val="22"/><w:szCs w:val="22"/>'
            . '<w:lang w:val="bs-BA"/>'
            . '</w:rPr>';

        $t = $escaped === ''
            ? ''
            : '<w:r>' . $rPr . '<w:t xml:space="preserve">' . $escaped . '</w:t></w:r>';

        return '<w:p>'
            . '<w:pPr>'
            . '<w:spacing w:after="' . $spaceAfter . '" w:line="276" w:lineRule="auto"/>'
            . '<w:jc w:val="' . $jc . '"/>'
            . $rPr
            . '</w:pPr>'
            . $t
            . '</w:p>';
    }

    private function contentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            . '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            . '</Types>';
    }

    private function relsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            . '</Relationships>';
    }

    private function documentRelsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            . '</Relationships>';
    }

    private function stylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
            . '<w:name w:val="Normal"/>'
            . '<w:qFormat/>'
            . '<w:rPr><w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/><w:sz w:val="22"/></w:rPr>'
            . '</w:style></w:styles>';
    }
}
