<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validateINN($inn) {
    return preg_match('/^\d{12}$/', $inn);
}

function validatePhone($phone) {
    return preg_match('/^\d{11}$/', $phone);
}

function getCalculatorData() {
    return [
        'fuelPrices' => [
            'gasoline' => 500200,
            'gas' => 200100,
            'diesel' => 320700,
        ],
        'fuelBrands' => [
            'gasoline' => ['Роснефть', 'Татнефть', 'Лукойл'],
            'gas' => ['Shell', 'Газпром', 'Башнефть'],
            'diesel' => ['Татнефть', 'Лукойл'],
        ],
        'tariffPromos' => [
            'economy' => [
							[
								"value" => 2,
							  "label" => "Скидка на топливо"
							],
							[
								"value" => 5,
							  "label" => "Скидка на мойку"
							],
						],
            'selected' => [
							[
								"value" => 5,
							  "label" => "Скидка на мойку"
							],
							[
								"value" => 20,
							  "label" => "Возврат НДС"
							],
						],
            'premium' => [
							[
								"value" => 50,
							  "label" => "Экономии на штрафах"
							],
							[
								"value" => 20,
							  "label" => "Возврат НДС"
							],
						],
        ],
				"allTariffPromos" => [
					[
						"value" => 50,
						"label" => "Экономии на штрафах"
					],
					[
						"value" => 20,
						"label" => "Возврат НДС"
					],
					[
						"value" => 5,
						"label" => "Скидка на мойку"
					],
					[
						"value" => 2,
						"label" => "Скидка на топливо"
					],
				],
        'tariffDiscounts' => [
            'economy' => 3,
            'selected' => 5,
            'premium' => 7,
        ],
        'tariffLimits' => [
            'gasoline' => ['economy' => 100, 'selected' => 300, 'premium' => -1],
            'gas' => ['economy' => 200, 'selected' => 700, 'premium' => -1],
            'diesel' => ['economy' => 150, 'selected' => 350, 'premium' => -1],
        ],
        'regions' => [
            ['id' => '1', 'name' => 'Регион 1', 'maxPump' => 1200],
            ['id' => '2', 'name' => 'Регион 2', 'maxPump' => 800],
            ['id' => '3', 'name' => 'Регион 3', 'maxPump' => 500],
				],
				'services' => [ 
					'Анализ топлива',
					'Контроль качества',
					'Доставка',
					'Хранение',
					'Сертификация',
					'Консультация'
			]
    ];
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'get_calculator_data':
        $data = getCalculatorData();
        echo json_encode(['success' => true, 'data' => $data]);
        break;
        
    case 'submit_order':
        processOrderForm();
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Unknown action']);
}

function processOrderForm() {
    $errors = [];

    if (!isset($_POST['inn']) || !validateINN($_POST['inn'])) {
        $errors[] = 'Неверный ИНН (должно быть ровно 12 цифр)';
    }

    if (!isset($_POST['phone']) || !validatePhone($_POST['phone'])) {
        $errors[] = 'Неверный телефон (должно быть ровно 11 цифр)';
    }

    if (!isset($_POST['email']) || !validateEmail($_POST['email'])) {
        $errors[] = 'Неверный email';
    }

    if (!isset($_POST['agree']) || !$_POST['agree']) {
        $errors[] = 'Необходимо согласие на обработку данных';
    }

    if (!empty($errors)) {
        echo json_encode(['success' => false, 'error' => implode(', ', $errors)]);
        exit;
    }

    $emailText = '<!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Результаты расчета</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 25px; background-color: #f9f9f9; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .section-title { color: #2980b9; margin-top: 0; }
            .result-item { margin-bottom: 10px; display: flex; }
            .result-label { font-weight: bold; min-width: 200px; }
            .highlight { color: #e74c3c; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 0.9em; color: #7f8c8d; text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Результаты расчета</h1>
        </div>
    
        <div class="section">
            <h2 class="section-title">Параметры расчета</h2>
            
            <div class="result-item">
                <span class="result-label">Регион:</span>
                <span>'.htmlspecialchars($_POST['region'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Прокачка:</span>
                <span>'.htmlspecialchars($_POST['pumpValue'] ?? '').' тонн/месяц</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Тип топлива:</span>
                <span>'.htmlspecialchars($_POST['fuelType'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Бренд:</span>
                <span>'.htmlspecialchars($_POST['brand'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Дополнительные услуги:</span>
                <span>'.htmlspecialchars($_POST['services'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Тариф:</span>
                <span>'.htmlspecialchars($_POST['tariff'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Промо-акция:</span>
                <span>'.htmlspecialchars($_POST['promo'] ?? '').'</span>
            </div>
        </div>
    
        <div class="section">
            <h2 class="section-title">Финансовые показатели</h2>
            
            <div class="result-item">
                <span class="result-label">Суммарная скидка:</span>
                <span class="highlight">'.htmlspecialchars($_POST['totalDiscount'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Экономия в месяц:</span>
                <span class="highlight">'.htmlspecialchars($_POST['monthlySavings'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Экономия в год:</span>
                <span class="highlight">'.htmlspecialchars($_POST['yearlySavings'] ?? '').'</span>
            </div>
        </div>
    
        <div class="section">
            <h2 class="section-title">Данные клиента</h2>
            
            <div class="result-item">
                <span class="result-label">ИНН:</span>
                <span>'.htmlspecialchars($_POST['inn'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Телефон:</span>
                <span>'.htmlspecialchars($_POST['phone'] ?? '').'</span>
            </div>
            
            <div class="result-item">
                <span class="result-label">Email:</span>
                <span>'.htmlspecialchars($_POST['email'] ?? '').'</span>
            </div>
        </div>
    
        <div class="footer">
            <p>Это письмо было сгенерировано автоматически. Пожалуйста, не отвечайте на него.</p>
        </div>
    </body>
    </html>';


		$clientEmail = $_POST['email'] ?? '';
		$companyEmail = 'orders@yourcompany.com'; 

		$subject = 'Результаты расчета топлива';

		$headers = "From: no-reply@yourcompany.com\r<br/>";
		$headers .= "Reply-To: no-reply@yourcompany.com\r<br/>";
		$headers .= "Content-Type: text/plain; charset=utf-8\r<br/>";

    require 'assets/vendor/autoload.php';
    
    if (!empty($clientEmail)) {

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = 'smtp.yandex.ru';
            $mail->SMTPAuth = true;
            $mail->Username = 'robert.soprano21@ya.ru'; // sensative data
            $mail->Password = 'cgqxqsnaczdkmrah'; // sensative data
            $mail->SMTPSecure = false;
            $mail->Port = 587; 
        
            $mail->setFrom('robert.soprano21@ya.ru', 'MERCK');
            $mail->addAddress($clientEmail, $clientEmail);
        
            $mail->CharSet = 'utf-8';

            $mail->addReplyTo('robert.soprano21@ya.ru', 'MERCK');


            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $emailText;
        
            $mail->send();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
          echo json_encode(['success' => false, 'error' => "Ошибка отправки письма компании!"]);
          exit;
          
      }
    }
  }
?>
