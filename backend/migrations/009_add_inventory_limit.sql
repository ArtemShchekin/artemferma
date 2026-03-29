
-- Миграция для добавления лимита инвентаря (20 овощей)
-- Добавляем триггер для проверки максимального количества предметов в инвентаре

DELIMITER $$

CREATE TRIGGER before_inventory_insert
BEFORE INSERT ON inventory
FOR EACH ROW
BEGIN
  DECLARE veg_count INT;
  
  IF NEW.kind IN ('veg_raw', 'veg_washed') THEN
    SELECT COUNT(*) INTO veg_count 
    FROM inventory 
    WHERE user_id = NEW.user_id 
      AND kind IN ('veg_raw', 'veg_washed')
      AND is_rotten = 0;
    
    IF veg_count >= 20 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Инвентарь полон! Максимум 20 овощей.';
    END IF;
  END IF;
END$$

CREATE TRIGGER before_inventory_update
BEFORE UPDATE ON inventory
FOR EACH ROW
BEGIN
  -- Если овощ становится протухшим, обновляем статус
  IF OLD.kind IN ('veg_raw', 'veg_washed') AND OLD.is_rotten = 0 
     AND NEW.is_rotten = 1 THEN
    SET NEW.status = 'rotten';
  END IF;
END$$

DELIMITER ;
