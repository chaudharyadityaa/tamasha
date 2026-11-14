<#
.SYNOPSIS
  Fills a LOCAL Tamasha backend with demo data through its public API: demo accounts, venues, seats,
  events, ticket types and a few paid bookings. Safe to run again: anything that exists is skipped.

.DESCRIPTION
  - Needs the backend running (for paid bookings, start it with EVENTHUB_DEMO_PAYMENTS=true).
  - Needs the ADMIN account that the backend created at first start.
  - The demo accounts use a published password, so this script refuses to talk to anything except
    localhost unless you pass -AllowRemote. Never run it against a real deployment.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\seed-demo.ps1 -AdminEmail you@example.com
#>
[CmdletBinding()]
param(
    [string]$ApiUrl = 'http://localhost:8080',
    [Parameter(Mandatory = $true)][string]$AdminEmail,
    [securestring]$AdminPassword,
    [string]$DemoPassword = 'Demo-Pass-2026!',
    [switch]$AllowRemote
)

$ErrorActionPreference = 'Stop'

# ---------- safety ----------
$apiUri = [Uri]$ApiUrl
if (-not $AllowRemote -and @('localhost', '127.0.0.1') -notcontains $apiUri.Host) {
    throw "Refusing to seed '$ApiUrl': the demo accounts use a published password. Use localhost, or pass -AllowRemote if you really mean it."
}
if (-not $AdminPassword) {
    $AdminPassword = Read-Host 'Admin password' -AsSecureString
}
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword)
try { $adminPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }

# ---------- helpers ----------
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Token,
        $Body,
        [hashtable]$ExtraHeaders
    )
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    if ($ExtraHeaders) { foreach ($key in $ExtraHeaders.Keys) { $headers[$key] = $ExtraHeaders[$key] } }
    $request = @{ Method = $Method; Uri = "$ApiUrl$Path"; Headers = $headers }
    if ($null -ne $Body) {
        $request['ContentType'] = 'application/json'
        $request['Body'] = $Body | ConvertTo-Json -Depth 6
    }
    Invoke-RestMethod @request
}

function Get-ApiStatus {
    param($ErrorRecord)
    $response = $ErrorRecord.Exception.Response
    if ($response) { return [int]$response.StatusCode }
    return $null
}

function Format-ApiError {
    param($ErrorRecord)
    $status = Get-ApiStatus $ErrorRecord
    $detail = $ErrorRecord.ErrorDetails.Message
    if ($detail) {
        try {
            $parsed = $detail | ConvertFrom-Json
            if ($parsed.detail) { $detail = $parsed.detail }
        }
        catch { }
    }
    if ($status) { return "HTTP $status. $detail" }
    return $ErrorRecord.Exception.Message
}

function Get-Token {
    param([string]$Email, [string]$Password)
    (Invoke-Api POST '/api/auth/login' $null @{ email = $Email; password = $Password }).accessToken
}

# Logs in when the account exists; otherwise registers it. Returns the user.
function Initialize-DemoUser {
    param([string]$Email, [string]$FullName)
    try {
        return (Invoke-Api POST '/api/auth/login' $null @{ email = $Email; password = $DemoPassword }).user
    }
    catch {
        if ((Get-ApiStatus $_) -ne 401) { throw }
    }
    return Invoke-Api POST '/api/auth/register' $null @{ email = $Email; password = $DemoPassword; fullName = $FullName }
}

function New-DemoBooking {
    param([string]$Token, $Body)
    $key = [guid]::NewGuid().ToString()
    return Invoke-Api POST '/api/bookings' $Token $Body @{ 'Idempotency-Key' = $key }
}

# Returns $false when the backend was started without demo payments (the endpoint then does not exist).
function Invoke-DemoPayment {
    param([string]$Token, $Booking)
    try {
        Invoke-Api POST "/api/bookings/$($Booking.id)/demo-payment" $Token | Out-Null
        return $true
    }
    catch {
        if ((Get-ApiStatus $_) -eq 404) { return $false }
        throw
    }
}

# ---------- the demo data ----------
$venueSpecs = @(
    @{ name = 'Grand Opera House'; addressLine = '12 Marine Drive'; city = 'Mumbai'; region = 'Maharashtra'; country = 'India'; timeZone = 'Asia/Kolkata'; capacity = 600 },
    @{ name = 'Lakeside Open Air Arena'; addressLine = 'Lake Road'; city = 'Udaipur'; region = 'Rajasthan'; country = 'India'; timeZone = 'Asia/Kolkata'; capacity = 2000 },
    @{ name = 'The Underground Room'; addressLine = '44 Church Street'; city = 'Bengaluru'; region = 'Karnataka'; country = 'India'; timeZone = 'Asia/Kolkata'; capacity = 150 }
)

$seatBlocks = @(
    @{ venue = 'Grand Opera House'; section = 'Stalls'; rows = @('A', 'B', 'C', 'D'); seatsPerRow = 12 },
    @{ venue = 'Grand Opera House'; section = 'Balcony'; rows = @('E', 'F'); seatsPerRow = 10 }
)

# days = days from today, hour and minute = local start time in India (UTC+5:30), duration = hours.
$eventSpecs = @(
    @{
        title = 'Midnight Ragas: An Evening of Sitar'; category = 'Music'; venue = 'Grand Opera House'; seating = 'RESERVED_SEATING'
        days = 10; hour = 19; minute = 30; duration = 3
        description = "A slow, glowing evening of classical sitar in the stalls and the balcony.`nDoors open at 6:30 pm. Bring a shawl: the hall is cool."
        types = @(
            @{ name = 'Stalls'; price = 1800; section = 'Stalls'; max = 4 },
            @{ name = 'Balcony'; price = 900; section = 'Balcony'; max = 6 }
        )
    },
    @{
        title = 'Sunset Sessions Live'; category = 'Music'; venue = 'Lakeside Open Air Arena'; seating = 'GENERAL_ADMISSION'
        days = 21; hour = 17; minute = 0; duration = 5
        description = "Five hours of live bands on the lake shore as the sun goes down.`nGeneral entry is on the lawn. The VIP lawn has the best view."
        types = @(
            @{ name = 'General'; price = 799; quantity = 800; max = 6 },
            @{ name = 'VIP Lawn'; price = 2499; quantity = 150; max = 4 }
        )
    },
    @{
        title = 'Laugh Riot: Stand-up Night'; category = 'Comedy'; venue = 'The Underground Room'; seating = 'GENERAL_ADMISSION'
        days = 7; hour = 20; minute = 0; duration = 2
        description = 'Four comedians, one tiny room, no mercy. Strong language ahead. Ages 16 and over.'
        types = @(
            @{ name = 'Entry'; price = 499; quantity = 120; max = 6 }
        )
    },
    @{
        title = 'The Last Train: A Monsoon Play'; category = 'Theatre'; venue = 'Grand Opera House'; seating = 'RESERVED_SEATING'
        days = 30; hour = 19; minute = 0; duration = 2.5
        description = "A stranded railway station, a night of rain and six passengers with secrets.`nA new play in English and Hindi."
        types = @(
            @{ name = 'Stalls'; price = 1200; section = 'Stalls'; max = 4 },
            @{ name = 'Balcony'; price = 600; section = 'Balcony'; max = 6 }
        )
    },
    @{
        title = 'City Lights Food and Music Festival'; category = 'Festival'; venue = 'Lakeside Open Air Arena'; seating = 'GENERAL_ADMISSION'
        days = 45; hour = 12; minute = 0; duration = 10
        description = 'A full day of street food stalls, folk music on three stages and a lantern parade at dusk.'
        types = @(
            @{ name = 'Day Pass'; price = 399; quantity = 1500; max = 8 }
        )
    },
    @{
        title = 'Intro to Photography Workshop'; category = 'Workshop'; venue = 'The Underground Room'; seating = 'GENERAL_ADMISSION'
        days = 14; hour = 10; minute = 0; duration = 4
        description = 'Learn light, framing and storytelling in four hands-on hours. Bring any camera, a phone is fine.'
        types = @(
            @{ name = 'Seat'; price = 999; quantity = 40; max = 2 }
        )
    },
    @{
        title = 'Charity 5K Fun Run'; category = 'Sports'; venue = 'Lakeside Open Air Arena'; seating = 'GENERAL_ADMISSION'
        days = 18; hour = 6; minute = 30; duration = 3
        description = 'Run, jog or walk five kilometres around the lake. Every entry supports a local school.'
        types = @(
            @{ name = 'Runner'; price = 299; quantity = 500; max = 5 }
        )
    }
)

# Paid bookings made for events created in THIS run, so running the script again never duplicates them.
$bookingPlan = @(
    @{ event = 'Laugh Riot: Stand-up Night'; who = 'ana'; items = @(@{ type = 'Entry'; qty = 2 }) },
    @{ event = 'Sunset Sessions Live'; who = 'ravi'; items = @(@{ type = 'General'; qty = 4 }) },
    @{ event = 'Sunset Sessions Live'; who = 'ana'; items = @(@{ type = 'VIP Lawn'; qty = 1 }) },
    @{ event = 'Intro to Photography Workshop'; who = 'ravi'; items = @(@{ type = 'Seat'; qty = 1 }) },
    @{ event = 'Midnight Ragas: An Evening of Sitar'; who = 'ana'; seatSection = 'Stalls'; seatCount = 2 },
    @{ event = 'Midnight Ragas: An Evening of Sitar'; who = 'ravi'; seatSection = 'Balcony'; seatCount = 2 }
)

# ---------- run ----------
try {
    Write-Host 'Signing in as the administrator...'
    $adminToken = Get-Token $AdminEmail $adminPlain

    Write-Host 'Preparing the demo accounts...'
    $organizer = Initialize-DemoUser 'organizer@demo.test' 'Demo Organizer'
    Initialize-DemoUser 'ana@demo.test' 'Ana Rao' | Out-Null
    Initialize-DemoUser 'ravi@demo.test' 'Ravi Menon' | Out-Null
    Invoke-Api PUT "/api/admin/users/$($organizer.id)/role" $adminToken @{ role = 'ORGANIZER' } | Out-Null
    $orgToken = Get-Token 'organizer@demo.test' $DemoPassword
    $tokens = @{
        ana  = Get-Token 'ana@demo.test' $DemoPassword
        ravi = Get-Token 'ravi@demo.test' $DemoPassword
    }

    Write-Host 'Venues...'
    $existingVenues = @((Invoke-Api GET '/api/organizer/venues?size=50' $orgToken).content)
    $venueIds = @{}
    foreach ($spec in $venueSpecs) {
        $found = $existingVenues | Where-Object { $_.name -eq $spec.name } | Select-Object -First 1
        if ($found) {
            $venueIds[$spec.name] = $found.id
            Write-Host "  exists, skipped: $($spec.name)"
            continue
        }
        $created = Invoke-Api POST '/api/organizer/venues' $orgToken $spec
        $venueIds[$spec.name] = $created.id
        Write-Host "  created: $($spec.name)"
    }

    Write-Host 'Seats...'
    foreach ($block in $seatBlocks) {
        $venueId = $venueIds[$block.venue]
        $sections = @(Invoke-Api GET "/api/organizer/venues/$venueId/seat-sections" $orgToken)
        if ($sections | Where-Object { $_.section -eq $block.section }) {
            Write-Host "  exists, skipped: $($block.venue) / $($block.section)"
            continue
        }
        Invoke-Api POST "/api/organizer/venues/$venueId/seat-blocks" $orgToken @{ section = $block.section; rows = $block.rows; seatsPerRow = $block.seatsPerRow } | Out-Null
        Write-Host "  created: $($block.venue) / $($block.section)"
    }

    Write-Host 'Events...'
    $existingEvents = @((Invoke-Api GET '/api/organizer/events?size=50' $orgToken).content)
    $createdEvents = @{}
    foreach ($spec in $eventSpecs) {
        $already = $existingEvents | Where-Object { $_.title -eq $spec.title } | Select-Object -First 1
        if ($already) {
            Write-Host "  exists, skipped: $($spec.title)"
            continue
        }
        # Local start time in India (UTC+5:30), converted to the UTC moment the API expects.
        $start = [DateTime]::UtcNow.Date.AddDays($spec.days).AddHours($spec.hour).AddMinutes($spec.minute - 330)
        $end = $start.AddHours($spec.duration)
        $event = Invoke-Api POST '/api/organizer/events' $orgToken @{
            venueId                 = $venueIds[$spec.venue]
            title                   = $spec.title
            description             = $spec.description
            category                = $spec.category
            startsAt                = $start.ToString('o')
            endsAt                  = $end.ToString('o')
            seatingMode             = $spec.seating
            currency                = 'INR'
            cancellationCutoffHours = 24
        }
        foreach ($type in $spec.types) {
            $body = @{ name = $type.name; price = $type.price; maxPerBooking = $type.max }
            if ($spec.seating -eq 'GENERAL_ADMISSION') { $body.quantityTotal = $type.quantity } else { $body.seatSection = $type.section }
            Invoke-Api POST "/api/organizer/events/$($event.id)/ticket-types" $orgToken $body | Out-Null
        }
        Invoke-Api POST "/api/organizer/events/$($event.id)/publish" $orgToken | Out-Null
        $createdEvents[$spec.title] = $event.id
        Write-Host "  created and published: $($spec.title)"
    }

    Write-Host 'Bookings...'
    $paymentsOff = $false
    $made = 0
    foreach ($plan in $bookingPlan) {
        if (-not $createdEvents.ContainsKey($plan.event)) { continue }
        $eventId = $createdEvents[$plan.event]
        $token = $tokens[$plan.who]
        if ($plan.ContainsKey('seatSection')) {
            $map = Invoke-Api GET "/api/events/$eventId/seats"
            $section = @($map.sections) | Where-Object { $_.section -eq $plan.seatSection } | Select-Object -First 1
            $seatIds = @($section.seats | Where-Object { $_.status -eq 'AVAILABLE' } | Select-Object -First $plan.seatCount | ForEach-Object { $_.id })
            $body = @{ eventId = $eventId; seatIds = $seatIds }
        }
        else {
            $detail = Invoke-Api GET "/api/events/$eventId"
            $items = @()
            foreach ($line in $plan.items) {
                $type = @($detail.ticketTypes) | Where-Object { $_.name -eq $line.type } | Select-Object -First 1
                $items += @{ ticketTypeId = $type.id; quantity = $line.qty }
            }
            $body = @{ eventId = $eventId; items = $items }
        }
        $booking = New-DemoBooking $token $body
        if (Invoke-DemoPayment $token $booking) {
            Write-Host "  paid: $($plan.who) booked '$($plan.event)' ($($booking.reference))"
        }
        else {
            $paymentsOff = $true
            Write-Host "  reserved but NOT paid: $($plan.who) booked '$($plan.event)'"
        }
        $made++
    }
    if ($made -eq 0) { Write-Host '  nothing to do (the events already existed)' }
    if ($paymentsOff) {
        Write-Host ''
        Write-Host 'Demo payments are switched off on this backend, so those bookings were only reserved and will expire.' -ForegroundColor Yellow
        Write-Host 'Restart the backend with $env:EVENTHUB_DEMO_PAYMENTS = "true" and delete the demo events to try again.' -ForegroundColor Yellow
    }

    Write-Host ''
    Write-Host 'Done. Open http://localhost:5173 to see the demo data.' -ForegroundColor Green
    Write-Host "Demo logins (password: $DemoPassword):"
    Write-Host '  organizer@demo.test   organizer: dashboard, sales numbers, check-in'
    Write-Host '  ana@demo.test         customer with paid bookings and tickets'
    Write-Host '  ravi@demo.test        customer with paid bookings and tickets'
}
catch {
    Write-Host ''
    Write-Host ('Stopped: ' + (Format-ApiError $_)) -ForegroundColor Red
    exit 1
}