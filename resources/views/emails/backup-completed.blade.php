<!DOCTYPE html>
<html lang="bs">
<head>
    <meta charset="UTF-8">
    <title>PlanTim Backup</title>
</head>
<body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
    <h2 style="color: #2563eb;">PlanTim — obavijest o backupu</h2>

    @if(($run['status'] ?? '') === 'success')
        <p style="color: #15803d; font-weight: bold;">Backup je uspješno završen.</p>
    @else
        <p style="color: #b91c1c; font-weight: bold;">Backup nije uspio.</p>
    @endif

    <table cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse;">
        <tr>
            <td><strong>Tip:</strong></td>
            <td>{{ ($run['trigger_type'] ?? '') === 'scheduled' ? 'Automatski (scheduler)' : 'Ručni' }}</td>
        </tr>
        <tr>
            <td><strong>Vrijeme:</strong></td>
            <td>{{ $run['completed_at'] ?? now()->format('Y-m-d H:i:s') }}</td>
        </tr>
        @if(!empty($run['db_filename']))
            <tr>
                <td><strong>SQL backup:</strong></td>
                <td>{{ $run['db_filename'] }} @if(!empty($run['db_size_formatted'])) ({{ $run['db_size_formatted'] }}) @endif</td>
            </tr>
        @endif
        @if(!empty($run['zip_filename']))
            <tr>
                <td><strong>ZIP projekta:</strong></td>
                <td>{{ $run['zip_filename'] }} @if(!empty($run['zip_size_formatted'])) ({{ $run['zip_size_formatted'] }}) @endif</td>
            </tr>
        @endif
        @if(!empty($run['destination_path']))
            <tr>
                <td><strong>Lokacija:</strong></td>
                <td>{{ $run['destination_path'] }}</td>
            </tr>
        @endif
        @if(!empty($run['error_message']))
            <tr>
                <td><strong>Greška:</strong></td>
                <td style="color: #b91c1c;">{{ $run['error_message'] }}</td>
            </tr>
        @endif
    </table>

    <p style="margin-top: 24px; color: #666; font-size: 12px;">
        Ova poruka je automatski generisana iz modula Administracija → Baza podataka.
    </p>
</body>
</html>
