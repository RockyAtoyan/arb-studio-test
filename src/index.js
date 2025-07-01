import './main.scss'
import './js/bootstrap.bundle.min'
import $ from 'jquery'

$(document).ready(function () {
	let currentRegionId = null
	let currentPumpValue = 100
	let currentFuelType = ''
	let currentBrand = ''
	let currentTariff = ''
	let currentTariffName = ''
	let currentPromo = 0
	let selectedServices = []
	let totalDiscount = 0
	let calculatorData = {}

	function loadCalculatorData() {
		$.ajax({
			url: 'index.php?action=get_calculator_data',
			type: 'GET',
			dataType: 'json',
			success: function (response) {
				if (response.success) {
					calculatorData = response.data
					initCalculator()
				} else {
					console.error('Failed to load calculator data')
				}
			},
			error: function (xhr, status, error) {
				console.error('Error loading calculator data:', error)
			},
		})
	}

	function initCalculator() {
		currentFuelType = Object.keys(calculatorData.fuelPrices)[0]
		currentBrand = calculatorData.fuelBrands[currentFuelType][0]
		currentTariff = 'economy'
		currentPromo = calculatorData.tariffPromos[currentTariff][0]['value']

		initRegions()
		initFuelTypes()
		initBrands()
		initServices()
		determineTariff()
		updatePromos()
		updateCalculator()
	}

	function setRegion(regionId) {
		const regionDropdownTrigger = $('#region-dropdown-trigger')
		currentRegionId = regionId
		regionDropdownTrigger.text(
			calculatorData.regions.find(r => r.id == regionId).name
		)
		updateMaxPumpValue()
		updateCalculator()
	}

	function initRegions() {
		const regionDropdownTrigger = $('#region-dropdown-trigger')
		regionDropdownTrigger.text('Выберите регион')
		regionDropdownTrigger.attr('disabled', false)
		const regionDropdown = $('#region-dropdown')
		regionDropdown.empty()

		calculatorData.regions.forEach(region => {
			const name = `${region.name} (макс. ${region.maxPump} тонн)`
			regionDropdown.append(
				`<li title="${name}" class="dropdown-item" data-region-id=${region.id} >${name}</li>`
			)
		})
		const firstRegion = calculatorData?.regions?.[0]
		if (firstRegion) setRegion(firstRegion.id)
		$('.calculator-regions .dropdown-item').click(function () {
			const regionId = $(this).data('region-id')
			setRegion(regionId)
		})
	}

	function initFuelTypes() {
		const fuelTypeGroup = $('.fuel-type')
		fuelTypeGroup.empty()

		Object.keys(calculatorData.fuelPrices).forEach(fuelType => {
			const id = fuelType
			const label =
				fuelType === 'gasoline' ? 'Бензин' : fuelType === 'gas' ? 'Газ' : 'ДТ'

			fuelTypeGroup.append(`
							<button data-fuel-type="${id}" class="btn fuel-btn">${label}</и>
					`)
		})

		$(`[data-fuel-type="${currentFuelType}"]`).toggleClass('active')

		$('.fuel-btn').click(function () {
			$('.fuel-btn').removeClass('active')
			const id = $(this).attr('data-fuel-type')
			$(`[data-fuel-type="${id}"]`).toggleClass('active')
			currentFuelType = id
			currentBrand = calculatorData.fuelBrands[currentFuelType][0]
			initBrands()
			determineTariff()
			updatePromos()
			updateCalculator()
		})
	}

	function initBrands() {
		const brandDropdownTrigger = $('#brand-dropdown-trigger')
		brandDropdownTrigger.text('Выберите бренд')
		brandDropdownTrigger.attr('disabled', false)
		const brandDropdown = $('#brand-dropdown')
		brandDropdown.empty()

		calculatorData.fuelBrands[currentFuelType].forEach(brand => {
			brandDropdown.append(
				`<li title="${brand}" class="dropdown-item" data-brand=${brand} >${brand}</li>`
			)
		})

		const firstBrand = calculatorData?.fuelBrands?.[currentFuelType]?.[0]
		if (firstBrand) {
			brandDropdownTrigger.text(firstBrand)
		}

		$('.calculator-brands .dropdown-item').click(function () {
			const brand = $(this).data('brand')
			currentBrand = brand
			brandDropdownTrigger.text(
				calculatorData.fuelBrands[currentFuelType].find(br => br == brand)
			)
		})
	}

	function initServices() {
		const servicesContainer = $('.services-container')
		servicesContainer.empty()

		calculatorData.services.forEach((service, index) => {
			servicesContainer.append(`
							<div class="form-check">
									<input class="form-check-input service-checkbox" type="checkbox" 
												 value="${service}" id="service${index + 1}">
									<label class="form-check-label" for="service${index + 1}">${service}</label>
							</div>
					`)
		})

		$('.service-checkbox').change(function () {
			updateSelectedServices()
		})
	}

	function updateSelectedServices() {
		selectedServices = []
		$('.service-checkbox:checked').each(function () {
			if (selectedServices.length < 4) {
				selectedServices.push($(this).val())
			} else {
				$(this).prop('checked', false)
			}
		})
		$('#selectedServicesCount').text(selectedServices.length)
	}

	function updateMaxPumpValue() {
		const regionId = currentRegionId
		if (!regionId) return
		const region = calculatorData.regions.find(r => r.id == regionId)
		const maxValue = region ? region.maxPump : 1200

		$('#pumpRange').attr('max', maxValue)
		$('#middlePumpValue').text((maxValue / 2).toFixed(0))
		$('#maxPumpValue').text(maxValue)
		$('#pumpRange').css(
			'--fill',
			($('#pumpRange').val() * 100) / maxValue + '%'
		)

		if (currentPumpValue > maxValue) {
			currentPumpValue = maxValue
			$('#pumpValue').text(maxValue)
			$('#pumpRange').val(maxValue)
		}
	}

	function determineTariff() {
		const limits = calculatorData.tariffLimits[currentFuelType]
		let newTariff

		if (currentPumpValue < limits.economy) {
			newTariff = 'economy'
		} else if (currentPumpValue < limits.selected) {
			newTariff = 'selected'
		} else {
			newTariff = 'premium'
		}

		if (newTariff !== currentTariff) {
			currentTariff = newTariff
			$(`#${newTariff}`).prop('checked', true)
			updatePromos()
			updateOrderButtonText()
		}
	}

	function updatePromos() {
		const promoContainer = $('.promo-container')
		promoContainer.empty()

		const promos = calculatorData.tariffPromos[currentTariff]

		promos
			.sort((pr1, pr2) => pr2.value - pr1.value)
			.forEach((promo, index) => {
				const isChecked = index === 0
				const promoValue = promo['value']
				const promoLabel = promo['label']
				if (isChecked) currentPromo = promoValue

				promoContainer.append(`
							<div class="promo-item">
									<input hidden class="form-check-input promo-radio" type="radio" 
												 name="promo" id="promo${index + 1}" value="${promoValue}" 
												 ${isChecked ? 'checked' : ''}>
									<label class="form-check-label promo-item__label" for="promo${index + 1}">
									<span>${promoValue}%</span>
									<p>${promoLabel.split(' ')[0]}<br>${promoLabel
					.split(' ')
					.slice(1)
					.join(' ')}</p>
									</label>
							</div>
					`)
			})

		calculatorData.allTariffPromos
			.filter(pr => promos.every(promo => promo.value !== pr.value))
			.forEach(promo => {
				const promoValue = promo['value']
				const promoLabel = promo['label']
				promoContainer.append(`
					<div class="promo-item disabled">
							<label class="form-check-label promo-item__label">
								<span>${promoValue}%</span>
								<p>${promoLabel.split(' ')[0]}<br>${promoLabel
					.split(' ')
					.slice(1)
					.join(' ')}</p>
							</label>
					</div>
			`)
			})

		$('.promo-radio').change(function () {
			currentPromo = parseInt($(this).val())
			updateCalculator()
		})

		updatePromoText()
	}

	function updatePromoText() {
		let promoText = ''
		switch (currentTariff) {
			case 'economy':
				promoText =
					'Акция: скидка до ' +
					Math.max(...calculatorData.tariffPromos.economy.map(pr => pr.value)) +
					'% на тариф Эконом'
				break
			case 'selected':
				promoText =
					'Акция: скидка до ' +
					Math.max(
						...calculatorData.tariffPromos.selected.map(pr => pr.value)
					) +
					'% на тариф Избранный'
				break
			case 'premium':
				promoText =
					'Акция: скидка до ' +
					Math.max(...calculatorData.tariffPromos.premium.map(pr => pr.value)) +
					'% на тариф Премиум'
				break
		}
		$('#promoText').text(promoText)
	}

	function updateOrderButtonText() {
		let tariffName = ''
		switch (currentTariff) {
			case 'economy':
				tariffName = 'Эконом'
				break
			case 'selected':
				tariffName = 'Избранный'
				break
			case 'premium':
				tariffName = 'Премиум'
				break
		}
		currentTariffName = tariffName
		$('#orderButton').attr('disabled', false)
		$('#orderButton').html(
			`<span>Заказать тариф «${tariffName}»</span> <i class="bi bi-arrow-right"></i>`
		)
		$('#orderModalButton').html(`<span>Заказать тариф «${tariffName}»</span>`)
		$('#tariffName span').text(tariffName)
	}

	function updateCalculator() {
		const pricePerTon = calculatorData.fuelPrices[currentFuelType]
		const tariffDiscount = calculatorData.tariffDiscounts[currentTariff]
		totalDiscount = tariffDiscount + currentPromo

		const baseCost = pricePerTon * currentPumpValue
		const discountAmount = (baseCost * totalDiscount) / 100
		const finalCost = baseCost - discountAmount

		const monthlySavings = discountAmount
		const yearlySavings = monthlySavings * 12

		$('#monthlyCost').text(`${formatNumber(finalCost)} ₽`)
		$('#totalDiscount').text(`${totalDiscount}%`)
		$('#monthlySavings').text(`${formatNumber(monthlySavings)} ₽`)
		$('#yearlySavings').text(`${formatNumber(yearlySavings)} ₽`)
	}

	loadCalculatorData()

	$('#pumpRange').on('input', function () {
		currentPumpValue = parseInt($(this).val())
		$('#pumpValue').text(currentPumpValue)

		determineTariff()
		updateCalculator()
		const regionId = currentRegionId
		if (!regionId) return
		const region = calculatorData.regions.find(r => r.id == regionId)
		const maxValue = region ? region.maxPump : 1200
		$(this).css('--fill', ($(this).val() * 100) / maxValue + '%')
	})

	$('#orderForm').submit(function (e) {
		e.preventDefault()
		if (this.checkValidity()) {
			submitOrder()
		} else {
			$(this).addClass('was-validated')
		}
	})

	function submitOrder() {
		$('#orderModalButton').attr('disabled', true)

		const formData = {
			action: 'submit_order',
			inn: $('#inn').val(),
			phone: $('#phone').val(),
			email: $('#email').val(),
			agree: $('#agree').is(':checked'),
			region: $('#region-dropdown-trigger').text(),
			pumpValue: currentPumpValue,
			fuelType: $(`[data-fuel-type="${currentFuelType}"]`).text(),
			brand: currentBrand,
			services: selectedServices.join(', ') || '—',
			tariff: currentTariffName,
			promo: currentPromo + '%',
			totalDiscount: totalDiscount + '%',
			monthlySavings: $('#monthlySavings').text(),
			yearlySavings: $('#yearlySavings').text(),
		}

		$.ajax({
			url: 'index.php',
			type: 'POST',
			data: formData,
			dataType: 'json',
			success: function (response) {
				if (response.success) {
					showFormMessage('Спасибо! Успешно отправлено.', 'success')
					$('#orderForm')[0].reset()
					$('#orderForm').removeClass('was-validated')
				} else {
					showFormMessage(`Ошибка: ${response.error}`, 'danger')
				}
			},
			error: function () {
				showFormMessage('Ошибка: проблема с соединением', 'danger')
			},
			complete: function () {
				$('#orderModalButton').attr('disabled', false)
			},
		})
	}

	function showFormMessage(message, type) {
		const $messageDiv = $('#formMessage')
		$messageDiv
			.removeClass('alert-success alert-danger')
			.addClass(`alert alert-${type}`)
		$messageDiv.text(message).show()

		setTimeout(() => {
			$messageDiv.fadeOut()
		}, 5000)
	}

	function formatNumber(num) {
		if (num > 9999999) {
			const millions = Math.floor(num / 1000000)
			return millions + ' млн'
		}
		return new Intl.NumberFormat('ru-RU').format(Math.round(num))
	}
})
